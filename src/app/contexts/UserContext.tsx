import { createContext, useContext, useState, ReactNode } from 'react';
import image_cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5 from 'figma:asset/cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5.png';

export interface UserData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  avatar: string;
  role: 'brand';
}

interface UserContextType {
  user: UserData;
  updateUser: (data: Partial<UserData>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUser: UserData = {
  id: 1,
  name: 'Công ty NetSpace',
  email: 'netspace@antifluence.com',
  phone: '+84 28 1234 5678',
  company: 'NetSpace Corporation',
  position: 'Marketing Director',
  avatar: image_cf7f08cfdf58e20ba38f1e7e3750f5304a2ed0f5,
  role: 'brand'
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>(defaultUser);

  const updateUser = (data: Partial<UserData>) => {
    setUser(prev => ({ ...prev, ...data }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
