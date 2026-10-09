import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { apiRequest } from '../services/api'


function useServerClock(token) {
  const [currentTime, setCurrentTime] =
    useState(null)

  const [isSynced, setIsSynced] =
    useState(false)

  const offsetRef = useRef(0)


  useEffect(() => {
    if (!token) {
      return
    }

    let clockInterval = null
    let syncInterval = null
    let stopped = false


    async function syncClock() {
      try {
        const requestStarted =
          Date.now()

        const data = await apiRequest(
          '/time',
          {},
          token,
        )

        const requestFinished =
          Date.now()

        const serverTime =
          new Date(
            data.current_time,
          ).getTime()

        /*
          Approximate when the server
          generated its response.

          Using the midpoint reduces the
          small error caused by network
          request time.
        */
        const localMidpoint =
          (
            requestStarted +
            requestFinished
          ) / 2

        offsetRef.current =
          serverTime -
          localMidpoint

        if (!stopped) {
          setCurrentTime(
            new Date(
              Date.now() +
              offsetRef.current,
            ),
          )

          setIsSynced(true)
        }
      } catch (error) {
        console.error(
          'Could not sync server time:',
          error,
        )
      }
    }


    syncClock()


    clockInterval =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date(
              Date.now() +
              offsetRef.current,
            ),
          )
        },
        1000,
      )


    syncInterval =
      window.setInterval(
        syncClock,
        5 * 60 * 1000,
      )


    return () => {
      stopped = true

      window.clearInterval(
        clockInterval,
      )

      window.clearInterval(
        syncInterval,
      )
    }
  }, [token])


  return {
    currentTime,
    isSynced,
  }
}


export default useServerClock