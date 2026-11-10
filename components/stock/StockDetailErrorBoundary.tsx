'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; symbol: string }
type State = { hasError: boolean }

export class StockDetailErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Unable to load {this.props.symbol} data
          </p>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            This stock may have incomplete or unavailable data from PSX. Try refreshing or check back later.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#FEA500,#986300)', color: 'white' }}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
