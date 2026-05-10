// Top navigation + Footer.
//
// Auth state (logged-in user, modal open/mode) was lifted into AuthContext
// during the React-Router migration so that any page or guard can interact
// with it. The Nav itself just renders against that context.
import { useState, type MouseEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../auth/AuthContext';

type NavProps = { active?: 'home' | 'analyze' | 'vacancies' | 'shortlist' | 'history' };

export function Nav({ active = 'home' }: NavProps) {
  const { user, logout, openAuth } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const guard = (to: string) => (e: MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openAuth('login');
    } else {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <nav className="site-nav" style={{ fontFamily: 'Pretendard' }}>
      <div className="container nav-inner">
        <Link to="/" className="logo">
          <span className="logo-mark"><Icon name="logo" size={22} /></span>
          <span className="logo-word">상권<b>AI</b></span>
          <span className="logo-tag">요식업 특화</span>
        </Link>
        <ul className="nav-links">
          <li className={active === 'home' ? 'is-active' : ''}>
            <NavLink to="/">서비스 소개</NavLink>
          </li>
          <li className={active === 'analyze' ? 'is-active' : ''}>
            <a href="/analyze" onClick={guard('/analyze')}>입지 분석</a>
          </li>
          <li className={active === 'vacancies' ? 'is-active' : ''}>
            <a href="/vacancies" onClick={guard('/vacancies')}>공실 탐색</a>
          </li>
          <li className={active === 'shortlist' ? 'is-active' : ''}>
            <a href="/shortlist" onClick={guard('/shortlist')}>찜 목록</a>
          </li>
          <li className={active === 'history' ? 'is-active' : ''}>
            <a href="/history" onClick={guard('/history')}>분석 이력</a>
          </li>
        </ul>
        <div className="nav-cta">
          {user ? (
            <div className="nav-user" onClick={() => setMenuOpen((v) => !v)}>
              <div className="nav-user-avatar">{user.name[0]}</div>
              <div className="nav-user-info">
                <div className="nav-user-name">{user.name}</div>
                <div className="nav-user-tier">{user.tier}</div>
              </div>
              {menuOpen && (
                <div className="nav-user-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { logout(); setMenuOpen(false); }}>
                    <Icon name="external" size={14} /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => openAuth('login')}>로그인</button>
              <button className="btn btn-primary btn-sm" onClick={() => openAuth('signup')}>
                무료로 시작
                <Icon name="arrow-right" size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="logo" style={{ color: '#fff' }}>
              <span className="logo-mark"><Icon name="logo" size={22} /></span>
              <span className="logo-word">상권<b>AI</b></span>
            </div>
            <p className="foot-tag">
              서울 요식업 창업자를 위한<br />
              데이터 기반 입지 추천 서비스.
            </p>
            <div className="foot-meta mono">
              <div>2020–2024년 서울 상권 데이터 기반</div>
              <div>© 2026 SANGGWON AI · 팀 프로젝트</div>
            </div>
          </div>
          <div className="foot-col">
            <h5>서비스</h5>
            <ul>
              <li><Link to="/analyze">입지 분석</Link></li>
              <li><a href="#">유동인구 히트맵</a></li>
              <li><Link to="/vacancies">공실 탐색</Link></li>
              <li><Link to="/shortlist">찜 목록</Link></li>
              <li><Link to="/history">분석 이력</Link></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>데이터</h5>
            <ul>
              <li><a href="#">서울 열린데이터광장</a></li>
              <li><a href="#">소상공인마당</a></li>
              <li><a href="#">공실매물 정보</a></li>
              <li><a href="#">공공데이터포털</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>팀</h5>
            <ul>
              <li><a href="#">소개</a></li>
              <li><a href="#">기술 스택</a></li>
              <li><a href="#">GitHub</a></li>
              <li><a href="#">문의</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bar">
          <span className="mono">추천 결과는 창업 의사결정을 돕는 참고 자료이며, 실제 수익이나 성공을 보장하지 않습니다.</span>
          <div className="foot-links"><a href="#">이용약관</a><a href="#">개인정보처리방침</a></div>
        </div>
      </div>
    </footer>
  );
}
