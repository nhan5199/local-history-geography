export function normalize(text: string): string {
  return text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const aliases: [RegExp, string][] = [
  [/\b(chu giai ban do|chu giai|map key|legend|ky hieu|ki hieu|symbols|symbol)\b/g, 'symbol'],
  [/\b(ban do|bando|map)\b/g, 'map'],
  [/\b(phuong huong|huong bac|la ban|compass|direction|north)\b/g, 'direction'],
  [/\b(nuoc mua|nuoc|dong song|song suoi|rainwater|water|streams|stream|river)\b/g, 'water'],
  [/\b(dong chay|chay|flow|flows)\b/g, 'flow'], [/\b(tren cao|xuong thap|downhill|higher|lower)\b/g, 'downhill'],
  [/\b(lich su|qua khu|ngay xua|history|past)\b/g, 'history'],
  [/\b(thay doi|doi thay|change|changes|changed)\b/g, 'change'],
  [/\b(buc anh|hinh anh|anh cu|photographs|photograph|photos)\b/g, 'photograph'],
  [/\b(dia danh|cot moc|landmarks|landmark)\b/g, 'landmark'],
  [/\b(nguon tu lieu|nguon|source|sources)\b/g, 'source'],
  [/\b(cau chuyen|ky uc|story|stories|memory)\b/g, 'story'],
  [/\b(thuong nguon|upstream)\b/g, 'upstream'], [/\b(ha luu|downstream)\b/g, 'downstream'],
];
const stop = new Set('a an the and or to of in on at is are was were be been it its this that these those i my me you your our we us can could do does did will would should how what why when where who which tell explain about please help more know learn learning lesson lessons some with for from em minh toi ban hay cho biet ve la gi nhu the nao tai sao o dau co cua nhung mot cac va de voi duoc khong nhe di thi nay ay lam dung hoc bai xem'.split(' '));
export function terms(text: string): string[] {
  let value = normalize(text);
  for (const [pattern, replacement] of aliases) value = value.replace(pattern, replacement);
  return [...new Set(value.split(' ').filter(word => word.length > 1 && !stop.has(word)))];
}
