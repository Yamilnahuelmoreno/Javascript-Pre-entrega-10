const URL_DATA = "./data/data.json";
const CLAVE_STORAGE = "inventario-productos";
const SEGUNDOS_HASTA_AVISO = 3;
const SEGUNDOS_AVISO_VISIBLE = 7;

class Producto {
    constructor(id, nombre, precio, stock) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
    }
}

let productos = [];
let siguienteId = 1;


const formulario = document.getElementById("form-producto");
const inputNombre = document.getElementById("input-nombre");
const inputPrecio = document.getElementById("input-precio");
const inputStock = document.getElementById("input-stock");
const inputBuscar = document.getElementById("input-buscar");
const contenedorItems = document.getElementById("contenedor-items");
const mensajeVacio = document.getElementById("mensaje-vacio");
const contadorItems = document.getElementById("contador-items");
const bannerAviso = document.getElementById("banner-aviso");
const estadoCarga = document.getElementById("estado-carga");
const btnRestablecer = document.getElementById("btn-restablecer");

function notificar(texto, tipo = "exito") {
    Toastify({
        text: texto,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        style: {
            background: tipo === "error" ? "#d9695f" : "#2f9e7a",
        },
    }).showToast();
}


function leerStorage() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) ?? null;
    } catch (error) {
        localStorage.removeItem(CLAVE_STORAGE);
        return null;
    }
}

function guardarEnStorage() {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(productos));
}


async function obtenerProductos() {
    const response = await fetch(URL_DATA);

    
    if (!response.ok) {
        throw new Error(`Error ${response.status} al leer los datos`);
    }

    const data = await response.json();
    return data.map(({ id, nombre, precio, stock }) => new Producto(id, nombre, precio, stock));
}

function mostrarCarga(cargando) {
    cargando
        ? estadoCarga.classList.add("estado-carga--visible")
        : estadoCarga.classList.remove("estado-carga--visible");
}


function calcularValorTotal(lista = productos) {
    return lista.reduce((acc, { precio, stock }) => acc + precio * stock, 0);
}

function renderizarProductos(lista = productos) {
    contenedorItems.innerHTML = "";

    lista.forEach(({ id, nombre, precio, stock }) => {
        const item = document.createElement("li");
        item.className = "item";
        item.dataset.id = id;

        item.innerHTML = `
            <div class="item__info">
                <h3>${nombre}</h3>
                <p>
                    $${precio.toLocaleString("es-AR")} ·
                    <span class="item__stock ${stock === 0 ? "item__stock--agotado" : ""}">
                        ${stock === 0 ? "Sin stock" : `Stock: ${stock}`}
                    </span>
                </p>
            </div>
            <button class="btn-eliminar" data-id="${id}">Eliminar</button>
        `;

        contenedorItems.appendChild(item);
    });

    lista.length === 0
        ? mensajeVacio.classList.add("estado-vacio--visible")
        : mensajeVacio.classList.remove("estado-vacio--visible");

    const cantidad = productos.length;
    contadorItems.textContent = `${cantidad} producto${cantidad === 1 ? "" : "s"} · Valor total: $${calcularValorTotal().toLocaleString("es-AR")}`;
}


function mostrarAviso(html) {
    bannerAviso.innerHTML = `<div class="banner__contenido">${html}</div>`;
    bannerAviso.classList.add("banner--visible");

    setTimeout(() => {
        bannerAviso.classList.remove("banner--visible");
    }, SEGUNDOS_AVISO_VISIBLE * 1000);
}

function programarAviso() {
    setTimeout(() => {
        const sinStock = productos.filter(({ stock }) => stock === 0).length;

        sinStock > 0
            ? mostrarAviso(`🔔 <strong>Recordatorio:</strong> tenés ${sinStock} producto${sinStock === 1 ? "" : "s"} sin stock para reponer.`)
            : mostrarAviso(`🔔 <strong>Resumen:</strong> todo el inventario tiene stock. Valor total: <strong>$${calcularValorTotal().toLocaleString("es-AR")}</strong>.`);
    }, SEGUNDOS_HASTA_AVISO * 1000);
}


async function iniciarApp() {
    mostrarCarga(true);

    try {
        const productosDeLaFuente = await obtenerProductos();
        const guardados = leerStorage();

        productos = guardados ?? productosDeLaFuente;
        guardados ?? guardarEnStorage();

        notificar("Productos cargados con éxito");
    } catch (error) {
        productos = leerStorage() ?? [];
        notificar(`No se pudieron cargar los productos: ${error.message}`, "error");
    } finally {
        siguienteId = productos.length ? Math.max(...productos.map(({ id }) => id)) + 1 : 1;
        mostrarCarga(false);
        renderizarProductos();
        programarAviso();
    }
}


formulario.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
        const nombre = inputNombre.value.trim();
        const precio = Number(inputPrecio.value);
        const stock = Number(inputStock.value);

        if (!nombre || !(precio > 0) || !Number.isInteger(stock) || stock < 0) {
            throw new Error("Completá nombre, un precio válido y un stock entero");
        }

        const nuevoProducto = new Producto(siguienteId, nombre, precio, stock);
        const { id, nombre: nombreAgregado } = nuevoProducto;

        productos.push(nuevoProducto);
        siguienteId++;

        guardarEnStorage();
        renderizarProductos();
        notificar(`Se agregó "${nombreAgregado}" al inventario`);
        formulario.reset();

        const itemNuevo = contenedorItems.querySelector(`[data-id="${id}"]`);
        itemNuevo?.classList.add("item--resaltado");
        setTimeout(() => itemNuevo?.classList.remove("item--resaltado"), 900);
    } catch (error) {
        notificar(error.message, "error");
    } finally {
        inputNombre.focus();
    }
});


contenedorItems.addEventListener("click", async (event) => {
    if (!event.target.classList.contains("btn-eliminar")) return;

    const id = Number(event.target.dataset.id);
    const producto = productos.find((p) => p.id === id);

    const resultado = await Swal.fire({
        title: "¿Eliminar producto?",
        text: `Se va a quitar "${producto?.nombre}" del inventario.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d9695f",
    });

    if (!resultado.isConfirmed) return;

    productos = productos.filter((p) => p.id !== id);
    guardarEnStorage();
    renderizarProductos();
    notificar(`Se eliminó "${producto?.nombre}" del inventario`);
});


inputBuscar.addEventListener("keyup", (event) => {
    const texto = event.target.value.toLowerCase();
    const filtrados = productos.filter(({ nombre }) =>
        nombre.toLowerCase().includes(texto)
    );
    renderizarProductos(filtrados);
});


btnRestablecer.addEventListener("click", async () => {
    const resultado = await Swal.fire({
        title: "¿Restablecer datos?",
        text: "Se van a perder los cambios que hiciste y se vuelven a cargar los productos originales.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, restablecer",
        cancelButtonText: "Cancelar",
    });

    if (!resultado.isConfirmed) return;

    localStorage.removeItem(CLAVE_STORAGE);
    inputBuscar.value = "";
    iniciarApp();
});


iniciarApp();
