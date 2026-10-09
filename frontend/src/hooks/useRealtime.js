import {
  useEffect,
  useRef,
} from 'react'

import { API_URL } from '../services/api'


function useRealtime(
  token,
  onEvent,
) {
  const onEventRef = useRef(onEvent)


  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])


  useEffect(() => {
    if (!token) {
      return
    }

    let socket = null
    let reconnectTimer = null
    let stopped = false


    function connect() {
      const websocketUrl =
        API_URL.replace(
          /^http/,
          'ws',
        )

      socket = new WebSocket(
        `${websocketUrl}/ws?token=${
          encodeURIComponent(token)
        }`,
      )


      socket.onopen = () => {
        console.log(
          'Realtime connection established',
        )
      }


      socket.onmessage = (event) => {
        try {
          const data =
            JSON.parse(event.data)

          onEventRef.current?.(
            data,
          )
        } catch {
          console.error(
            'Invalid realtime message',
          )
        }
      }


      socket.onclose = () => {
        if (stopped) {
          return
        }

        reconnectTimer =
          window.setTimeout(
            connect,
            2000,
          )
      }


      socket.onerror = () => {
        socket?.close()
      }
    }


    connect()


    return () => {
      stopped = true

      if (reconnectTimer) {
        window.clearTimeout(
          reconnectTimer,
        )
      }

      if (
        socket &&
        (
          socket.readyState ===
            WebSocket.OPEN ||
          socket.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        socket.close()
      }
    }
  }, [token])
}


export default useRealtime