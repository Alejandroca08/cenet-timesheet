import { useEffect, useState } from 'react'

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    function handleMouseMove(e) {
      setPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-[background] duration-100 ease-out"
      style={{
        background: `
          radial-gradient(ellipse 500px 400px at ${pos.x}% ${pos.y}%, rgba(201,100,66,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 400px 300px at 75% 15%, rgba(201,100,66,0.03) 0%, transparent 60%)
        `,
      }}
    />
  )
}
