// Countries with calling codes, used by phone sign-in on the TV and the website.
// ISO code, calling code and English name. Names are shown with the flag.
const RAW =
  'AF:93:Afghanistan|AL:355:Albania|DZ:213:Algeria|AD:376:Andorra|AO:244:Angola|AR:54:Argentina|AM:374:Armenia|AU:61:Australia|' +
  'AT:43:Austria|AZ:994:Azerbaijan|BH:973:Bahrain|BD:880:Bangladesh|BY:375:Belarus|BE:32:Belgium|BZ:501:Belize|BJ:229:Benin|' +
  'BT:975:Bhutan|BO:591:Bolivia|BA:387:Bosnia and Herzegovina|BW:267:Botswana|BR:55:Brazil|BN:673:Brunei|BG:359:Bulgaria|' +
  'BF:226:Burkina Faso|KH:855:Cambodia|CM:237:Cameroon|CA:1:Canada|CL:56:Chile|CN:86:China|CO:57:Colombia|CR:506:Costa Rica|' +
  'CI:225:Côte d’Ivoire|HR:385:Croatia|CU:53:Cuba|CY:357:Cyprus|CZ:420:Czechia|DK:45:Denmark|DO:1:Dominican Republic|' +
  'EC:593:Ecuador|EG:20:Egypt|SV:503:El Salvador|EE:372:Estonia|ET:251:Ethiopia|FJ:679:Fiji|FI:358:Finland|FR:33:France|' +
  'GE:995:Georgia|DE:49:Germany|GH:233:Ghana|GR:30:Greece|GT:502:Guatemala|HN:504:Honduras|HK:852:Hong Kong|HU:36:Hungary|' +
  'IS:354:Iceland|IN:91:India|ID:62:Indonesia|IR:98:Iran|IQ:964:Iraq|IE:353:Ireland|IL:972:Israel|IT:39:Italy|JM:1:Jamaica|' +
  'JP:81:Japan|JO:962:Jordan|KZ:7:Kazakhstan|KE:254:Kenya|KW:965:Kuwait|KG:996:Kyrgyzstan|LA:856:Laos|LV:371:Latvia|' +
  'LB:961:Lebanon|LY:218:Libya|LT:370:Lithuania|LU:352:Luxembourg|MO:853:Macao|MG:261:Madagascar|MW:265:Malawi|MY:60:Malaysia|' +
  'MV:960:Maldives|ML:223:Mali|MT:356:Malta|MU:230:Mauritius|MX:52:Mexico|MD:373:Moldova|MC:377:Monaco|MN:976:Mongolia|' +
  'ME:382:Montenegro|MA:212:Morocco|MZ:258:Mozambique|MM:95:Myanmar|NA:264:Namibia|NP:977:Nepal|NL:31:Netherlands|' +
  'NZ:64:New Zealand|NI:505:Nicaragua|NE:227:Niger|NG:234:Nigeria|MK:389:North Macedonia|NO:47:Norway|OM:968:Oman|' +
  'PK:92:Pakistan|PS:970:Palestine|PA:507:Panama|PG:675:Papua New Guinea|PY:595:Paraguay|PE:51:Peru|PH:63:Philippines|' +
  'PL:48:Poland|PT:351:Portugal|PR:1:Puerto Rico|QA:974:Qatar|RO:40:Romania|RU:7:Russia|RW:250:Rwanda|SA:966:Saudi Arabia|' +
  'SN:221:Senegal|RS:381:Serbia|SG:65:Singapore|SK:421:Slovakia|SI:386:Slovenia|SO:252:Somalia|ZA:27:South Africa|' +
  'KR:82:South Korea|ES:34:Spain|LK:94:Sri Lanka|SD:249:Sudan|SE:46:Sweden|CH:41:Switzerland|SY:963:Syria|TW:886:Taiwan|' +
  'TJ:992:Tajikistan|TZ:255:Tanzania|TH:66:Thailand|TT:1:Trinidad and Tobago|TN:216:Tunisia|TR:90:Türkiye|TM:993:Turkmenistan|' +
  'UG:256:Uganda|UA:380:Ukraine|AE:971:United Arab Emirates|GB:44:United Kingdom|US:1:United States|UY:598:Uruguay|' +
  'UZ:998:Uzbekistan|VE:58:Venezuela|VN:84:Vietnam|YE:967:Yemen|ZM:260:Zambia|ZW:263:Zimbabwe';

export interface Country {
  iso: string;
  dial: string;
  name: string;
  flag: string;
}

const flagOf = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const COUNTRIES: Country[] = RAW.split('|').map((row) => {
  const [iso, dial, name] = row.split(':');
  return { iso, dial, name, flag: flagOf(iso) };
});
