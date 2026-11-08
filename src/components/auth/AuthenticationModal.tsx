import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { X, ShieldCheck, Key, Fingerprint, Eye, EyeOff, Lock, CheckCircle2, Award, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types/marketplace';

interface AuthenticationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthenticationModal: React.FC<AuthenticationModalProps> = ({ isOpen, onClose }) => {
  const { currentRole, setCurrentRole } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'signin' | 'apply'>('signin');
  const [selectedRoleType, setSelectedRoleType] = useState<'buyer' | 'seller'>('buyer');
  const [identifier, setIdentifier] = useState('sterling@residence.com');
  const [passkey, setPasskey] = useState('••••••••••••••••');
  const [showPasskey, setShowPasskey] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricActive, setBiometricActive] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleSelect = (role: 'buyer' | 'seller') => {
    setSelectedRoleType(role);
    if (role === 'buyer') {
      setIdentifier('sterling@residence.com');
    } else {
      setIdentifier('lukas@ateliervane.ch');
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      setCurrentRole(selectedRoleType);
      setAuthSuccessMsg(`Cryptographic signature verified. Welcome, ${selectedRoleType === 'buyer' ? 'Julian Sterling' : 'Lukas Vane'}.`);
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 1400);
    }, 700);
  };

  const handleBiometricAuth = () => {
    setBiometricActive(true);
    setTimeout(() => {
      setBiometricActive(false);
      setCurrentRole(selectedRoleType);
      setAuthSuccessMsg('WebAuthn FIDO2 Biometric handshake verified.');
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FAF8F5] border border-[#E3DDD0] rounded shadow-[0_12px_48px_rgba(14,59,58,0.2)] overflow-hidden max-h-[95vh] flex flex-col">
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-[#E3DDD0] bg-[#FFFFFF] flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 text-[#5E6663] hover:text-[#0E3B3A] rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="font-editorial text-lg tracking-[0.05em] text-[#0E3B3A] font-semibold block">
              OZONE
            </span>
            <span className="text-[9px] uppercase tracking-[0.16em] text-[#717978] block">
              Authentication Entry
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0E3B3A] text-white flex items-center justify-center text-xs font-serif font-bold">
            {selectedRoleType === 'buyer' ? 'JS' : 'AV'}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Hero Banner with Visual Vignette */}
          <div className="relative rounded overflow-hidden bg-[#0E3B3A] text-white p-5 space-y-2 border border-[#164C4B]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#C9A25D]/20 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#7FE3C4] animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#7FE3C4] font-medium">
                Autonomous Escrow • Edition N° 09
              </span>
            </div>
            <h2 className="font-editorial text-2xl font-normal leading-snug">
              Enter the Sovereign Guild.
            </h2>
            <p className="text-xs text-[#E3DDD0] leading-relaxed">
              Curated acquisitions, verified physical provenance, and autonomous escrow settlement.
            </p>
          </div>

          {/* Role Switcher Pill */}
          <div className="grid grid-cols-2 p-1 bg-[#ECE7DC] rounded border border-[#E3DDD0] text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleRoleSelect('buyer')}
              className={`py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRoleType === 'buyer'
                  ? 'bg-[#FFFFFF] text-[#0E3B3A] shadow-xs'
                  : 'text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#0E3B3A]" />
              <span>Collector / Buyer</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('seller')}
              className={`py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRoleType === 'seller'
                  ? 'bg-[#FFFFFF] text-[#0E3B3A] shadow-xs'
                  : 'text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              <Award className="w-4 h-4 text-[#C9A25D]" />
              <span>Atelier / Master</span>
            </button>
          </div>

          {/* Mode Title & Badge */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-editorial text-xl text-[#0E3B3A]">
                {selectedRoleType === 'buyer' ? 'Collector Sign In' : 'Master Atelier Portal'}
              </h3>
              <p className="text-xs text-[#5E6663] mt-0.5">
                {selectedRoleType === 'buyer'
                  ? 'Access your archival vault, tracked specimens, and private reservations.'
                  : 'Manage studio inventory, hallmark wax verifications, and transparent ledger.'}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0">
              Verified Provenance
            </span>
          </div>

          {/* Sign In vs Apply Tabs */}
          <div className="flex border-b border-[#E3DDD0] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`pb-2 pr-4 font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                activeTab === 'signin'
                  ? 'border-[#0E3B3A] text-[#0E3B3A]'
                  : 'border-transparent text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('apply')}
              className={`pb-2 px-4 font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                activeTab === 'apply'
                  ? 'border-[#0E3B3A] text-[#0E3B3A]'
                  : 'border-transparent text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              Apply For Access
            </button>
          </div>

          {authSuccessMsg && (
            <div className="p-3 bg-[#E8F5E9] border border-[#2F7D5B] text-[#1B5E20] text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Identifier */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#0E3B3A]">
                    {selectedRoleType === 'buyer' ? 'Collector Identifier or Dossier Email' : 'Master Guild Dossier Email'}
                  </label>
                  <span className="font-mono-tabular text-[10px] text-[#717978]">
                    REF: {selectedRoleType === 'buyer' ? 'OZ-9821' : 'AV-KYOTO-01'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#717978]">
                    <span className="text-xs">@</span>
                  </div>
                  <input
                    type="email"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A] font-mono-tabular"
                  />
                </div>
              </div>

              {/* Archival Passkey */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#0E3B3A]">
                    Archival Passkey
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Passkey reset link dispatched to authenticated cryptographic enclave.')}
                    className="text-[10px] text-[#C9A25D] hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    Forgot Passkey?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#717978]">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPasskey ? 'text' : 'password'}
                    value={passkey}
                    onChange={e => setPasskey(e.target.value)}
                    required
                    className="w-full pl-8 pr-10 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A] font-mono-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#717978] hover:text-[#0E3B3A] cursor-pointer"
                  >
                    {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cipher Integrity Gauge */}
              <div className="p-3 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#5E6663] uppercase tracking-wider font-semibold">
                    Cipher Integrity
                  </span>
                  <span className="font-mono-tabular text-[#2F7D5B] font-semibold text-[11px]">
                    Sovereign Grade
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5">
                  <div className="bg-[#2F7D5B] rounded-xs" />
                  <div className="bg-[#2F7D5B] rounded-xs" />
                  <div className="bg-[#2F7D5B] rounded-xs" />
                  <div className="bg-[#C9A25D] rounded-xs" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#717978] pt-1">
                  <span>✓ 8+ Glyphs</span>
                  <span>✓ Uppercase & Numeral</span>
                  <span>🛡 Hardware Enclave</span>
                </div>
              </div>

              {/* Security Note */}
              <div className="p-3 bg-[#FDF2F1] border border-[#F5C2BE] rounded text-[11px] text-[#9A2E26] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Security Note</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Physical hardware signature verified. Session anchored to local secure enclave.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isAuthenticating ? (
                    <span>Validating Enclave...</span>
                  ) : (
                    <>
                      <span>Enter Sovereign Vault</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={biometricActive}
                  className="w-full py-2 px-4 bg-[#FFFFFF] hover:bg-[#FAF8F5] border border-[#E3DDD0] text-[#0E3B3A] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Fingerprint className={`w-4 h-4 text-[#C9A25D] ${biometricActive ? 'animate-ping' : ''}`} />
                  <span>{biometricActive ? 'Scanning Biometrics...' : 'Sign In with Passkey / Face ID'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-white border border-[#E3DDD0] rounded space-y-3 text-xs">
              <h4 className="font-editorial text-base text-[#0E3B3A]">Atelier Accreditation Dossier</h4>
              <p className="text-[#5E6663] leading-relaxed">
                Independent master craftspeople and certified ateliers can petition for sovereign inclusion in Ozone’s Vol. IV archive.
              </p>
              <div className="space-y-2 text-[11px] text-[#14181A]">
                <div className="p-2 bg-[#FAF8F5] rounded border border-[#E3DDD0]">
                  <strong>Phase 1:</strong> Guild Provenance Audit & Spectrometry
                </div>
                <div className="p-2 bg-[#FAF8F5] rounded border border-[#E3DDD0]">
                  <strong>Phase 2:</strong> SWIFT / MUFG Banking Escrow Clearance
                </div>
                <div className="p-2 bg-[#FAF8F5] rounded border border-[#E3DDD0]">
                  <strong>Phase 3:</strong> Physical Hallmark Seal Engraving at Tokyo or Zurich Hub
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert('Application initiated. Accreditation officer will review material within 48 hours.');
                  setActiveTab('signin');
                }}
                className="w-full py-2 bg-[#0E3B3A] text-white text-xs font-semibold rounded cursor-pointer mt-2"
              >
                Submit Accreditation Petition
              </button>
            </div>
          )}

          {/* Cryptographic Registry Badge */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#FFFFFF] border border-[#E3DDD0] flex items-center justify-center text-[#C9A25D] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-[11px] leading-snug">
              <span className="font-semibold text-[#0E3B3A] block uppercase tracking-wider text-[10px]">
                Cryptographic Atelier Registry
              </span>
              <p className="text-[#5E6663]">
                Every piece cataloged within OZONE is cryptographically bound to physical ceramic or bronze certificates.
              </p>
            </div>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => alert('Concierge inquiry window opened for bespoke acquisition.')}
              className="text-[11px] text-[#717978] hover:text-[#0E3B3A] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Unregistered Atelier?</span>
              <span className="text-[#C9A25D] font-semibold underline">Request Private Audience →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
