import { startCase, toLower, toUpper } from 'lodash';


export function title_case(text)
{
    if (!text) return '';
    // Fix replace roman numerals, for example: Vii -> VII
    const PATTERN = /\b([LXIVCDM])([lxivcdm]+)\b/g;
    return startCase(toLower(text)).replace(PATTERN,
            (_, a, b) => a + toUpper(b));
}
