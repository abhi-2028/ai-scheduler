import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) return null;

    try {
      const parsedUser = JSON.parse(storedUser) as
        | User
        | { data?: { user?: User } };

      // Backward compatibility: older builds stored the whole API response.
      if ('data' in parsedUser && parsedUser.data?.user) {
        return parsedUser.data.user;
      }

      return parsedUser as User;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('token');

    if (storedToken) return storedToken;

    // Backward compatibility: older builds could store token on wrapped user.
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;

    try {
      const parsedUser = JSON.parse(storedUser) as {
        data?: { token?: string };
      };
      return parsedUser.data?.token ?? null;
    } catch {
      return null;
    }
  });

  const [isLoading] = useState(false);

  // useEffect(() => {
  //   if (token) {
  //     api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  //   } else {
  //     delete api.defaults.headers.common['Authorization'];
  //   }
  // }, [token]);

  const login = (userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
