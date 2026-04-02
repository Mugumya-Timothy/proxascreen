import { useLayoutEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setAuthTokenGetter } from '../services/api'

type Props = {
  children: React.ReactNode
}

export default function ApiAuthSync({ children }: Props) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useLayoutEffect(() => {
    setAuthTokenGetter(async () => {
      if (!isLoaded || !isSignedIn) {
        return null
      }

      return getToken()
    })

    setIsReady(true)

    return () => {
      setAuthTokenGetter(null)
    }
  }, [getToken, isLoaded, isSignedIn])

  if (!isReady) {
    return null
  }

  return <>{children}</>
}