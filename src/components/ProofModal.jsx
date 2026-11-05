import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, PenTool, CheckCircle2, QrCode } from 'lucide-react';
import { Modal } from '../components/ui';
import { useStore } from '../store/StoreContext';

export default function ProofModal({ delivery, onClose }) {
  const { update, toast } = useStore();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [signatureName, setSignatureName] = useState('');
  const [scanCode, setScanCode] = useState(delivery?.tracking_code || '');
  const [loading, setLoading] = useState(false);
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Gestion du doigt / souris pour la signature
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Upload de la photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const fileName = `proofs/${delivery.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('documents').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
      setPhotoUrl(data.publicUrl);
      toast('Photo ajoutée');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  // Validation finale
  const handleValidate = async () => {
    if (!photoUrl) return toast('La photo est obligatoire', 'err');
    if (!signatureName.trim()) return toast('Le nom du signataire est obligatoire', 'err');

    setLoading(true);
    try {
      // 1. Sauvegarde de la signature (dessin) en image
      let signatureUrl = null;
      if (canvasRef.current) {
        const signatureData = canvasRef.current.toDataURL('image/png');
        const blob = await (await fetch(signatureData)).blob();
        const sigName = `signatures/${delivery.id}-${Date.now()}.png`;
        await supabase.storage.from('documents').upload(sigName, blob);
        const { data } = supabase.storage.from('documents').getPublicUrl(sigName);
        signatureUrl = data.publicUrl;
      }

      // 2. Mise à jour de la livraison
      await update('deliveries', {
        id: delivery.id,
        status: 'Livrée',
        proof_url: photoUrl,
        signature_url: signatureUrl,
        signature_name: signatureName,
        tracking_code: scanCode, // On enregistre le code scanné
      }, 'Chauffeur');
      
      toast('Livraison validée avec succès !');
      onClose();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!delivery} onClose={onClose} title="Preuve de livraison" wide>
      <div className="stack" style={{ gap: 20 }}>
        
        {/* 1. SCAN DU COLIS */}
        <div className="card card-pad">
          <div className="row" style={{ gap: 10 }}>
            <div className="icon-tile blue"><QrCode size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Scanner le colis</div>
              <div className="small muted">Scannez le code-barres ou saisissez le numéro de suivi.</div>
            </div>
          </div>
          <input 
            className="input mt-2" 
            placeholder="Code de suivi (ex: LIV-12345)" 
            value={scanCode} 
            onChange={(e) => setScanCode(e.target.value)} 
          />
        </div>

        {/* 2. SIGNATURE DU CLIENT */}
        <div className="card card-pad">
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <div className="icon-tile orange"><PenTool size={16} /></div>
            <div>
              <div style={{ fontWeight: 700 }}>Signature du client</div>
              <div className="small muted">Demandez au client de signer avec son doigt.</div>
            </div>
          </div>
          <input 
            className="input mb-2" 
            placeholder="Nom du signataire" 
            value={signatureName} 
            onChange={(e) => setSignatureName(e.target.value)} 
          />
          <div style={{ border: '2px dashed var(--border)', borderRadius: 8, background: 'var(--surface-3)', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              style={{ width: '100%', touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <button className="btn btn-ghost btn-sm" onClick={clearCanvas} style={{ position: 'absolute', top: 10, right: 10 }}>
              Effacer
            </button>
          </div>
        </div>

        {/* 3. PHOTO DU COLIS */}
        <div className="card card-pad">
          <div className="row" style={{ gap: 10 }}>
            <div className="icon-tile green"><Camera size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Photo du colis livré</div>
              <div className="small muted">Prenez une photo du colis à l'endroit de la livraison.</div>
            </div>
          </div>
          <div className="row mt-2" style={{ gap: 12 }}>
            {photoUrl && <img src={photoUrl} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />}
            <input type="file" id="proof-photo" hidden accept="image/*" onChange={handlePhotoUpload} />
            <label htmlFor="proof-photo" className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Camera size={14} /> {photoUrl ? 'Changer la photo' : 'Prendre une photo'}
            </label>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-block" 
          style={{ height: 50, fontSize: '1rem' }} 
          onClick={handleValidate} 
          disabled={loading}
        >
          <CheckCircle2 size={18} /> {loading ? 'Validation...' : 'Valider la livraison'}
        </button>
      </div>
    </Modal>
  );
}