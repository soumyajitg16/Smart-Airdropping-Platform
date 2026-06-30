import { useContext } from 'react';
import { AppContext } from '../context/AppContextBase';

export const useApp = () => useContext(AppContext);
