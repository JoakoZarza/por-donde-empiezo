import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('la app arranca y muestra su nombre', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /por dónde empiezo/i })).toBeInTheDocument()
})
