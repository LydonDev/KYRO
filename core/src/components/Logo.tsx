import { APP_LOGO } from '../config';

export default function Logo() {
    return (
        <img src={APP_LOGO} alt="Logo" className="w-4 h-4 invert" />
    );
}