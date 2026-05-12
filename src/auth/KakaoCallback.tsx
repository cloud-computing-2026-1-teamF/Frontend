import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authApi } from '../api';

const OAUTH_STATE_KEY = 'sg_oauth_state';

export function KakaoCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !isExpectedState('kakao', state)) {
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

function isExpectedState(provider: 'kakao', state: string | null): boolean {
  if (!state) return true;
  try {
    const stored = localStorage.getItem(OAUTH_STATE_KEY);
    localStorage.removeItem(OAUTH_STATE_KEY);
    return stored === state && state.startsWith(`${provider}:`);
  } catch {
    return true;
  }
}
