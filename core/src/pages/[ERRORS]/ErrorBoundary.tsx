import React, { Component, ReactNode } from 'react';
import GeneralError from './GeneralError';

interface Props {
  children: ReactNode;
  minimal?: boolean;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <GeneralError minimal={this.props.minimal} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
