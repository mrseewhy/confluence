import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginationBar } from './PaginationBar'

describe('PaginationBar', () => {
  it('renders null when totalPages is 1 or less', () => {
    const { container } = render(
      <PaginationBar
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders null when totalPages is 0', () => {
    const { container } = render(
      <PaginationBar
        currentPage={1}
        totalPages={0}
        onPageChange={() => {}}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('displays page info text without total items', () => {
    render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('displays page info text with total items', () => {
    render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        totalItems={100}
        onPageChange={() => {}}
      />,
    )

    expect(
      screen.getByText('100 total · Page 2 of 5'),
    ).toBeInTheDocument()
  })

  it('renders Prev and Next buttons', () => {
    render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next page' }),
    ).toBeInTheDocument()
  })

  it('disables Prev button on first page', () => {
    render(
      <PaginationBar
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Next page' }),
    ).not.toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(
      <PaginationBar
        currentPage={5}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Next page' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).not.toBeDisabled()
  })



  it('calls onPageChange with previous page number on Prev click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <PaginationBar
        currentPage={3}
        totalPages={5}
        onPageChange={handleChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(handleChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with next page number on Next click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <PaginationBar
        currentPage={3}
        totalPages={5}
        onPageChange={handleChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(handleChange).toHaveBeenCalledWith(4)
  })

  it('renders with sm size (default) correctly', () => {
    const { container } = render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    // sm size has borderTop
    const root = container.firstChild as HTMLElement
    // The inline style includes borderTop for sm
    expect(root.style.borderTop).toBeTruthy()
  })

  it('renders with md size correctly', () => {
    const { container } = render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
        size="md"
      />,
    )

    const root = container.firstChild as HTMLElement
    // md size has no borderTop
    expect(root.style.borderTop).toBeFalsy()
  })

  it('applies custom styles via style prop', () => {
    const { container } = render(
      <PaginationBar
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
        style={{ marginTop: '24px' }}
      />,
    )

    const root = container.firstChild as HTMLElement
    expect(root.style.marginTop).toBe('24px')
  })
})
