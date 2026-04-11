import logo from '../assets/drip_directive_logo.jpg';

export default function BrandMark({ compact = false }) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`}>
      <img className="brand-mark__logo" src={logo} alt="Dripdirective" />
      <div>
        <p className="brand-mark__eyebrow">Personal styling</p>
        <h1 className="brand-mark__title">Dripdirective</h1>
      </div>
    </div>
  );
}
