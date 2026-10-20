import { Link } from 'react-router'
import { useTitulo } from '../estado/useTitulo'

/*
  La política de privacidad, dentro de la app y en su propia dirección
  (/privacidad), para poder enlazarla desde Ajustes, desde el aviso de IA, desde el
  README y desde una tienda.

  Está escrita para que la lea una persona y no un abogado: qué se guarda, dónde, y
  qué sale del teléfono y cuándo. Lo que dice tiene que ser verdad del código; si el
  código cambia en algo de esto, esta página cambia con él. El texto de la IA es el
  de la sección 9.3 de la especificación, sin resumir.
*/

/** Cuándo cambió por última vez lo que dice esta página. */
const ACTUALIZADA = new Date('2026-10-20T12:00:00-03:00')
const FECHA = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' })

const REPOSITORIO = 'https://github.com/JoakoZarza/por-donde-empiezo'

export default function Privacidad() {
  useTitulo('Privacidad')

  return (
    <main className="pantalla pantalla--lectura">
      <h1 className="pantalla__titulo">Privacidad</h1>
      <p className="menudo">
        Última actualización: <time dateTime="2026-10-20">{FECHA.format(ACTUALIZADA)}</time>
      </p>

      <section className="grupo">
        <h2 className="grupo__titulo">En corto</h2>
        <p>
          Todo lo que cargás en Por dónde empiezo se guarda <strong>solo en tu teléfono</strong>. No hay cuentas, no
          hay publicidad, no hay analítica ni rastreadores, y no tenemos servidores que reciban tus datos. Lo único que
          puede salir del teléfono es lo que vos mandás a la IA, si la activás, y la copia que vos decidís bajar.
        </p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Qué se guarda y dónde</h2>
        <p>
          En el almacenamiento del navegador de tu teléfono quedan los ambientes que elegiste, sus tareas, los planes,
          lo que hiciste (los totales de «Lo que hiciste») y tus ajustes, incluida la clave de IA si cargaste una.
        </p>
        <p>
          Eso no viaja a ningún lado. Si cambiás de teléfono, no lo podemos recuperar nosotros: por eso existe la copia
          de Ajustes.
        </p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Lo que no hacemos</h2>
        <ul className="lista-lectura">
          <li>No pedimos cuenta, correo ni teléfono.</li>
          <li>No usamos analítica, cookies de seguimiento ni rastreadores de terceros.</li>
          <li>No mostramos publicidad ni vendemos datos: no tenemos datos tuyos para vender.</li>
        </ul>
        <p>
          La app se sirve desde Vercel, que como cualquier servidor web puede registrar datos técnicos de cada visita
          —por ejemplo, la dirección IP— para funcionar y protegerse. Esos registros son de Vercel y no los usamos.
        </p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">La IA, si la activás</h2>
        <p>
          Es opcional y está apagada de entrada. Para activarla hay que tener 18 años o más y aceptar este aviso en
          Ajustes:
        </p>
        <blockquote className="aviso-ia">
          <p>
            <strong>Antes de usar la IA, leé esto.</strong>
          </p>
          <p>
            Vas a usar tu propia clave de Google. Lo que le mandes —textos y <strong>fotos de tu casa</strong>— viaja a
            los servidores de Google. En el plan gratuito, Google puede usar ese contenido para mejorar sus productos{' '}
            <strong>y personas revisoras pueden leerlo</strong>. No mandes fotos donde aparezcan documentos, pantallas,
            personas ni nada que no quieras compartir.
          </p>
          <p>
            Tu clave se guarda <strong>solo en este teléfono</strong> y nunca pasa por nuestros servidores.
          </p>
          <p>Podés usar la app completa sin activar esto.</p>
        </blockquote>
        <p>
          El pedido sale de tu teléfono directo a Google, solo cuando tocás «Pedí ideas». Lo que Google hace con él
          depende de sus propios términos. Si el aviso cambia, la app te lo vuelve a pedir antes de seguir.
        </p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Enlaces a otros sitios</h2>
        <p>
          Los botones de música abren Spotify o YouTube, y «Invitame un cafecito» abre Cafecito. Al tocarlos salís de
          la app y rigen las políticas de esos sitios. Si hacés un aporte, el pago lo procesa Cafecito: nosotros no
          vemos tu tarjeta ni tus datos de pago.
        </p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Tus datos son tuyos</h2>
        <ul className="lista-lectura">
          <li>
            <strong>Llevártelos:</strong> en Ajustes, «Guardá una copia» baja un archivo con todo. La clave de IA no
            viaja en la copia.
          </li>
          <li>
            <strong>Borrarlos:</strong> en Ajustes, «Empezá de cero en este teléfono». También se borran si eliminás
            los datos del sitio desde el navegador o desinstalás la app.
          </li>
          <li>
            <strong>Cuidado:</strong> si pasás muchos días sin abrirla, algunos navegadores borran los datos por su
            cuenta. Instalarla en la pantalla de inicio lo evita; si no, guardá una copia de vez en cuando.
          </li>
        </ul>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Edad</h2>
        <p>La app no está pensada para menores de 18 años, y la función de IA lo exige explícitamente.</p>
      </section>

      <section className="grupo">
        <h2 className="grupo__titulo">Contacto</h2>
        <p>
          Para preguntas sobre privacidad, escribinos abriendo un tema en{' '}
          <a href={`${REPOSITORIO}/issues`} target="_blank" rel="noopener noreferrer" translate="no">
            GitHub
          </a>
          . El código de la app es público: cualquiera puede revisar que hace lo que dice esta página.
        </p>
      </section>

      <div className="pantalla__pie">
        <Link className="boton-secundario" to="/ajustes">
          Volvé a Ajustes
        </Link>
        <Link className="boton-principal" to="/">
          Volvé al principio
        </Link>
      </div>
    </main>
  )
}
