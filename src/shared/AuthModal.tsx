// Auth modal — Login / Signup. Reads its open/mode from AuthContext so any
// page can pop it via useAuth().openAuth(...) or window.dispatchEvent.
import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from './Icon';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api';

type Step = 'form' | 'loading' | 'success';
const OAUTH_STATE_KEY = 'sg_oauth_state';

export function AuthModal() {
  const { authOpen, authMode, closeAuth, openAuth, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [nick, setNick] = useState('');
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Reset transient form state whenever the modal closes or the user
  // switches between login/signup. Without this, an old error or a stale
  // password lingers when the modal is reopened.
  useEffect(() => {
    if (!authOpen) {
      setEmail(''); setPw(''); setPw2(''); setNick('');
      setAgree(false); setErrMsg(null); setStep('form');
    }
  }, [authOpen]);
  useEffect(() => { setErrMsg(null); }, [authMode]);

  if (!authOpen) return null;
  const isLogin = authMode === 'login';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setStep('loading');
    try {
      const res = isLogin
        ? await api.auth.login({ email, password: pw })
        : await api.auth.signup({ email, password: pw, name: nick });
      setUser(res.user);
      setStep('success');
      setTimeout(() => { closeAuth(); setStep('form'); }, 1200);
    } catch (err) {
      setStep('form');
      setErrMsg(err instanceof ApiError ? err.message : '요청에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="auth-backdrop" onClick={closeAuth}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={closeAuth}><Icon name="close" size={16} /></button>

        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-logo"><img src="/logo.png" alt="상권을 부탁해" /></div>
            <h2><b>상권</b>을 부탁해</h2>
          </div>
          <div className="auth-quote">
            <p>지도에 위치만 찍으면,<br />AI가 주변 상권·유동인구·경쟁을 분석해<br />창업 입지 <b>Top 3</b>를 추천해드려요.</p>
          </div>
          <div className="auth-points">
            <div className="auth-point"><Icon name="map-pin" size={15} /><span>지도 기반 공실매물 탐색</span></div>
            <div className="auth-point"><Icon name="chart" size={15} /><span>상권 · 유동인구 데이터 분석</span></div>
            <div className="auth-point"><Icon name="trending" size={15} /><span>예상 생존률 기반 입지 추천</span></div>
          </div>
        </div>

        <div className="auth-right">
          {step === 'success' ? (
            <div className="auth-success">
              <div className="auth-success-circle"><Icon name="check" size={36} /></div>
              <h3>{isLogin ? '환영합니다' : '가입이 완료되었습니다'}</h3>
              <p>{isLogin ? '대시보드로 이동합니다…' : '맞춤 추천을 시작해보세요'}</p>
            </div>
          ) : (
            <>
              <div className="auth-tabs">
                <button className={isLogin ? 'is-on' : ''} onClick={() => openAuth('login')}>로그인</button>
                <button className={!isLogin ? 'is-on' : ''} onClick={() => openAuth('signup')}>회원가입</button>
              </div>

              <div className="auth-head">
                <h3>{isLogin ? '다시 만나서 반가워요' : '데이터 기반 창업의 시작'}</h3>
                <p>{isLogin ? '저장된 공실매물과 분석 이력을 확인하세요' : '간단한 정보만 입력하면 바로 분석을 시작할 수 있습니다'}</p>
              </div>

              <div className="auth-social">
                <button className="auth-social-btn" onClick={() => {
                  const kakaoClientId = import.meta.env.VITE_KAKAO_CLIENT_ID;
                  if (!isConfigured(kakaoClientId)) {
                    setErrMsg('카카오 REST API 키가 설정되지 않았어요.');
                    return;
                  }
                  const state = createOAuthState('kakao');
                  const redirectUri = encodeURIComponent(import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/auth/kakao/callback`);
                  window.location.href = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoClientId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}`;
                }}>
                  <span className="auth-social-ico" style={{ background: '#FEE500' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#000" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.74 1.79 5.14 4.5 6.54l-1.13 4.16c-.1.37.32.65.65.45L11 19.36c.33.04.66.04 1 .04 5.52 0 10-3.48 10-7.6S17.52 3 12 3z" /></svg>
                  </span>
                  카카오로 계속하기
                </button>
                <button className="auth-social-btn" onClick={() => {
                  const naverClientId = import.meta.env.VITE_NAVER_CLIENT_ID;
                  if (!isConfigured(naverClientId)) {
                    setErrMsg('네이버 Client ID가 설정되지 않았어요.');
                    return;
                  }
                  const redirectUri = encodeURIComponent(import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/auth/naver/callback`);
                  const state = createOAuthState('naver');
                  window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naverClientId}&redirect_uri=${redirectUri}&state=${state}`;
                }}>
                  <span className="auth-social-ico" style={{ background: '#03C75A' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#fff" d="M16.7 4.5h3.8v15h-4.4l-7.1-9.7v9.7H5.2v-15h4.4l7.1 9.7V4.5z" /></svg>
                  </span>
                  네이버로 계속하기
                </button>
              </div>

              <div className="auth-divider"><span>또는 이메일로</span></div>

              <form className="auth-form" onSubmit={submit}>
                {!isLogin && (
                  <div className="auth-field">
                    <label>닉네임</label>
                    <div className="auth-input">
                      <Icon name="users" size={14} />
                      <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="창업준비생" required />
                    </div>
                  </div>
                )}
                <div className="auth-field">
                  <label>{isLogin ? '아이디' : '이메일'}</label>
                  <div className="auth-input">
                    <Icon name={isLogin ? 'users' : 'mail'} size={14} />
                    <input
                      type={isLogin ? 'text' : 'email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isLogin ? '아이디를 입력하세요' : 'user@example.com'}
                      autoComplete={isLogin ? 'username' : 'email'}
                      required
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label>비밀번호 {!isLogin && <span className="auth-hint">8자 이상</span>}</label>
                  <div className="auth-input">
                    <Icon name="lock" size={14} />
                    <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required minLength={isLogin ? 1 : 8} />
                  </div>
                  {!isLogin && pw.length > 0 && (
                    <div className="auth-pwbar">
                      <span style={{ width: `${Math.min(pw.length * 12, 100)}%`, background: pw.length >= 8 ? '#16B981' : pw.length >= 4 ? '#F4B431' : '#E85070' }} />
                    </div>
                  )}
                </div>
                {!isLogin && (
                  <div className="auth-field">
                    <label>비밀번호 확인</label>
                    <div className="auth-input">
                      <Icon name="lock" size={14} />
                      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" required />
                    </div>
                    {pw2.length > 0 && pw !== pw2 && <div className="auth-error">비밀번호가 일치하지 않습니다</div>}
                  </div>
                )}

                <div className="auth-row">
                  {isLogin ? (
                    <>
                      <label className="auth-check">
                        <input type="checkbox" />
                        <span>로그인 유지</span>
                      </label>
                      <a href="#" className="auth-link">비밀번호 찾기</a>
                    </>
                  ) : (
                    <label className="auth-check">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                      <span><a href="#" className="auth-link">이용약관</a> · <a href="#" className="auth-link">개인정보처리방침</a>에 동의합니다</span>
                    </label>
                  )}
                </div>

                {errMsg && <div className="auth-error" style={{ marginTop: 4 }}>{errMsg}</div>}

                <button type="submit" className="btn btn-primary auth-submit" disabled={step === 'loading'}>
                  {step === 'loading' ? (
                    <><span className="spin" />{isLogin ? '로그인 중...' : '가입 처리중...'}</>
                  ) : (
                    <>{isLogin ? '로그인' : '계정 만들기'}<Icon name="arrow-right" size={14} /></>
                  )}
                </button>

                <div className="auth-footer-text">
                  {isLogin ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
                  <a className="auth-link" onClick={() => openAuth(isLogin ? 'signup' : 'login')}>
                    {isLogin ? '회원가입' : '로그인'}
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function isConfigured(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim() !== ''
    && !value.includes('your_')
    && !value.includes('replace-this');
}

function createOAuthState(provider: 'kakao' | 'naver'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const state = `${provider}:${random}`;
  try {
    localStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {
    // OAuth still works; callback just cannot perform the CSRF state check.
  }
  return state;
}
