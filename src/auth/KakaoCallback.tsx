import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authApi } from '../api';

export function KakaoCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      navigate('/');
      return;
    }
    authApi.kakaoLogin(code)
    .then((data) => {
        setUser(data.user);
        navigate('/');
    })
    .catch(() => {
        navigate('/');
    });
  }, []);

  return <div>카카오 로그인 처리 중...</div>;
}
