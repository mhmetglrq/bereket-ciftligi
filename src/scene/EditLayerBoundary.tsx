import { Component, type ErrorInfo, type ReactNode } from 'react';

export class EditLayerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Düzenleme katmanı açılamadı', error, info);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
