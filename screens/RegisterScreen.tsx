import React from 'react';
import { LoginScreen } from './LoginScreen';

type Props = {
  onLogin: (user: any, token: string) => void;
};

export const RegisterScreen: React.FC<Props> = ({ onLogin }) => {
  return <LoginScreen onLogin={onLogin} initialMode="register" />;
};
