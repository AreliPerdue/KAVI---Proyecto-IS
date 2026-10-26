/**
 * Hacer algo que puede fallar sin que se lleve lo demás (T373): si `hacer` truena, se avisa con `avisar` y se usa lo
 * que dé `respaldo`. El motor lo usa al dibujar cada pieza, para que una rota no deje la hoja entera sin nada.
 */
export function conRespaldo(hacer, respaldo, avisar = () => {}) {
  try {
    return hacer();
  } catch (e) {
    avisar(e);
    return respaldo();
  }
}
