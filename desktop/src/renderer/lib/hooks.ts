/**
 * Hook nhỏ dùng chung cho các màn hình.
 *
 * `useServerMessage` thay cho `màn hình tự đăng ký handler` bên JavaFX: mỗi màn hình
 * nhận message máy chủ trong lúc nó còn mount, handler luôn là bản mới nhất (tránh
 * closure cũ), và tự huỷ đăng ký khi unmount.
 */
import { useEffect, useRef } from 'react'
import type { ServerMessage } from '@shared/protocol'
import { subscribeServerMessages } from './connection-store'

export function useServerMessage(handler: (message: ServerMessage) => void): void {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => subscribeServerMessages((message) => handlerRef.current(message)), [])
}
