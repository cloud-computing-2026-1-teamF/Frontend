import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authApi } from '../api';

export function NaverCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      navigate('/');
      return;
    }
    authApi.naverLogin(code, state)
      .then((data) => {
        setUser(data.user);
        navigate('/');
      })
      .catch(() => {
        navigate('/');
      });
  }, []);

  return <div>네이버 로그인 처리 중...</div>;
}
