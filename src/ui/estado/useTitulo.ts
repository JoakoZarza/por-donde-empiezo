import { useEffect } from 'react'

/*
  El título de la pestaña refleja la pantalla actual. Es una regla de AGENTS.md
  —«<title> matches current context»— y también lo que hace que el historial del
  navegador sea legible.
*/
export function useTitulo(texto: string): void {
  useEffect(() => {
    document.title = `${texto} · Por dónde empiezo`
  }, [texto])
}
