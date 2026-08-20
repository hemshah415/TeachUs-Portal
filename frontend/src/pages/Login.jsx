import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Building2, ShieldCheck, UserCheck, Lock, ArrowRight, CheckCircle, FileCheck, BarChart3, Download } from "lucide-react";
import logoImg from "../assets/logo.png";
import ThemeToggle from "../components/ThemeToggle";

const Login = () => {
  const [activeTab, setActiveTab] = useState("ADMIN");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleQuickFill = (userType) => {
    if (userType === 'ADMIN') {
      setActiveTab('ADMIN');
      setUsername('admin');
      setPassword('admin123');
    } else {
      setActiveTab('COLLEGE');
      setUsername('nkc_user');
      setPassword('college123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const result = await loginUser(username, password);
    setLoading(false);

    if (result.success) {
      if (result.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/college");
      }
    } else {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center px-3 py-5 position-relative">
      <div className="position-absolute top-0 end-0 p-4">
        <ThemeToggle />
      </div>

      <div className="row w-100 justify-content-center" style={{ maxWidth: '1050px' }}>
        
        {/* Left Info Panel */}
        <div className="col-lg-6 mb-4 mb-lg-0 d-flex flex-column justify-content-center text-dark pe-lg-5">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="p-2 rounded-4 shadow-sm bg-white border border-slate-200 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
              <img src={logoImg} alt="TeachUs Brand Icon" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 className="fw-extrabold mb-0 font-outfit text-dark" style={{ fontSize: '2.4rem' }}>TeachUs</h2>
              <span className="text-danger fw-bold uppercase" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
                Centralized Academic Data System
              </span>
            </div>
          </div>

          <p className="text-secondary fs-5 mb-4" style={{ lineHeight: '1.6' }}>
            Replaces manual email exchanges with centralized Excel uploads, instant automated validation, and real-time admin monitoring.
          </p>

          <div className="d-flex flex-column gap-3 mb-4">
            <div className="d-flex align-items-center gap-3 glass-card py-3 px-3 shadow-sm bg-white border border-secondary border-opacity-25">
              <Download size={22} className="text-danger" />
              <span className="fw-semibold text-dark">Admin uploads official template & colleges download latest version</span>
            </div>
            <div className="d-flex align-items-center gap-3 glass-card py-3 px-3 shadow-sm bg-white border border-secondary border-opacity-25">
              <FileCheck size={22} className="text-danger" />
              <span className="fw-semibold text-dark">Instant automated row & column validation with error reports</span>
            </div>
            <div className="d-flex align-items-center gap-3 glass-card py-3 px-3 shadow-sm bg-white border border-secondary border-opacity-25">
              <BarChart3 size={22} className="text-danger" />
              <span className="fw-semibold text-dark">Real-time admin progress dashboard & Power BI analytics feed</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="col-lg-5 col-md-8">
          <div className="glass-panel p-4 p-md-5 bg-white shadow-lg border border-danger border-opacity-25">
            
            <div className="d-flex mb-4 p-1 rounded-3 bg-light border border-slate-200">
              <button
                type="button"
                className={`btn flex-fill py-2 d-flex align-items-center justify-content-center gap-2 fw-bold rounded-3 transition-all ${
                  activeTab === 'ADMIN' ? 'btn-danger shadow' : 'text-secondary border-0 bg-transparent'
                }`}
                onClick={() => setActiveTab('ADMIN')}
              >
                <ShieldCheck size={18} />
                <span>Admin Login</span>
              </button>

              <button
                type="button"
                className={`btn flex-fill py-2 d-flex align-items-center justify-content-center gap-2 fw-bold rounded-3 transition-all ${
                  activeTab === 'COLLEGE' ? 'btn-danger shadow' : 'text-secondary border-0 bg-transparent'
                }`}
                onClick={() => setActiveTab('COLLEGE')}
              >
                <UserCheck size={18} />
                <span>College User</span>
              </button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3 fs-6">
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-dark fw-bold small text-uppercase">Username or Email</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-danger border-secondary border-opacity-50">
                    <UserCheck size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-white text-dark border-secondary border-opacity-50 py-2 fw-semibold"
                    placeholder={activeTab === 'ADMIN' ? 'admin' : 'nkc_user'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label text-dark fw-bold small text-uppercase">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-danger border-secondary border-opacity-50">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    className="form-control bg-white text-dark border-secondary border-opacity-50 py-2 fw-semibold"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-gradient-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2 mb-3 shadow"
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <>
                    <span className="fw-bold">Authenticate Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-top border-slate-200 text-center">
              <span className="text-secondary small fw-semibold d-block mb-2">Demo Quick Fill Credentials:</span>
              <div className="d-flex justify-content-center gap-2">
                <button 
                  type="button" 
                  onClick={() => handleQuickFill('ADMIN')} 
                  className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold"
                  style={{ fontSize: '0.78rem' }}
                >
                  Admin: admin / admin123
                </button>
                <button 
                  type="button" 
                  onClick={() => handleQuickFill('COLLEGE')} 
                  className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-bold"
                  style={{ fontSize: '0.78rem' }}
                >
                  College: nkc_user / college123
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
