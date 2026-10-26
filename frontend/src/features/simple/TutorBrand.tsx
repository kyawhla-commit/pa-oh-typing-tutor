import { Link } from 'react-router-dom';
import { Keyboard } from 'lucide-react';

export default function TutorBrand() {
  return <Link className="tutor-brand" to="/" aria-label="Pa’O Typing Tutor home"><span className="brand-icon"><Keyboard size={22} /></span><span>pa’o<span className="brand-caption">typing tutor</span></span></Link>;
}
