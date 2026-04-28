"use client"

import { useState, useEffect } from "react"

export function useLoadingMessages(messages: string[], intervalMs: number = 3000) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [messages, intervalMs])

  return messages[index]
}
