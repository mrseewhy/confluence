import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('renders a password input by default', () => {
    render(<PasswordInput value="" onChange={() => {}} />)

    const input = screen.getByLabelText('Password')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renders with a custom label', () => {
    render(<PasswordInput label="New Password" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('New Password')).toBeInTheDocument()
  })

  it('renders with an empty label when label="" is passed', () => {
    const { container } = render(
      <PasswordInput label="" value="" onChange={() => {}} />,
    )

    // No label element should be rendered
    expect(container.querySelector('label')).not.toBeInTheDocument()
  })

  it('shows the eye-off (hide) icon initially and toggles on click', async () => {
    const user = userEvent.setup()
    render(<PasswordInput value="" onChange={() => {}} />)

    const toggleButton = screen.getByRole('button', {
      name: 'Show password',
    })
    expect(toggleButton).toBeInTheDocument()

    // Click to show password
    await user.click(toggleButton)

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'text')

    // Button label should now say "Hide password"
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toBeInTheDocument()

    // Click again to hide
    await user.click(
      screen.getByRole('button', { name: 'Hide password' }),
    )
    expect(input).toHaveAttribute('type', 'password')
    expect(
      screen.getByRole('button', { name: 'Show password' }),
    ).toBeInTheDocument()
  })

  it('forwards the onChange handler', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<PasswordInput value="" onChange={handleChange} />)

    const input = screen.getByLabelText('Password')
    await user.type(input, 'm')

    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with a placeholder', () => {
    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        placeholder="At least 8 characters"
      />,
    )

    const input = screen.getByPlaceholderText('At least 8 characters')
    expect(input).toBeInTheDocument()
  })

  it('renders a hint when provided', () => {
    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        hint="Use at least 8 characters"
      />,
    )

    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument()
  })

  it('forwards the autoComplete attribute', () => {
    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        autoComplete="new-password"
      />,
    )

    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })

  it('forwards the required attribute', () => {
    render(<PasswordInput value="" onChange={() => {}} required />)

    expect(screen.getByLabelText('Password')).toBeRequired()
  })

  it('forwards a custom id', () => {
    render(
      <PasswordInput value="" onChange={() => {}} id="my-password" />,
    )

    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'id',
      'my-password',
    )
  })
})
