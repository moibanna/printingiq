import { Link, router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInputProps, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Category, CITIES, ColorOption, Group, GROUPS, Product, tintOf, Vendor } from '../lib/catalog';
import { formatConverted, formatPrice, formatRate, shortDate, unitKey } from '../lib/format';
import { LANG_LABEL, LANGS, StringKey, useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { C, MAX_W, R } from '../lib/theme';
import { Icon, IconName } from './icons';
import { Text, TextInput } from './text';

/** Platform support number shown in the top bar and footer. Replace with your own. */
export const SUPPORT_PHONE = '9647500000000';

const flat = (...st: (object | false | undefined)[]) => StyleSheet.flatten(st.filter(Boolean) as object[]);

/** True on the website at desktop/laptop width: shows the website header and footer instead of app tabs. */
export function useWide() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 900;
}

export function Screen({ children, scroll = true, footer = true }: { children: ReactNode; scroll?: boolean; footer?: boolean }) {
  const wide = useWide();
  const inner = <View style={s.screenInner}>{children}</View>;
  if (!scroll) return <View style={s.screen}>{inner}</View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: wide ? 0 : 40 }} keyboardShouldPersistTaps="handled">
      {inner}
      {wide && footer && <Footer />}
    </ScrollView>
  );
}

export const H = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.h, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.muted, style]}>{children}</Text>;

/** Section heading with a tinted label and a rule, plus an optional "See all" link. */
export function SectionTitle({ title, href, icon }: { title: string; href?: string; icon?: string }) {
  const { t, arrow } = useI18n();
  return (
    <View style={s.sectionRow}>
      <View style={[s.sectionPill, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        {icon && <Icon name={icon} size={18} color={C.primary} />}
        <Text style={s.sectionText}>{title}</Text>
      </View>
      <View style={{ flex: 1 }} />
      {href && (
        <Link href={href as never} asChild>
          <Pressable><Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{t('seeAll')} {arrow}</Text></Pressable>
        </Link>
      )}
    </View>
  );
}

type BtnVariant = 'primary' | 'accent' | 'outline' | 'whatsapp' | 'danger' | 'white' | 'ghost';
export function Button({ title, onPress, variant = 'primary', style, disabled, small, icon }: {
  title: string; onPress?: () => void; variant?: BtnVariant; style?: ViewStyle; disabled?: boolean; small?: boolean; icon?: IconName;
}) {
  const bg = { primary: C.primary, accent: C.accent, outline: 'transparent', whatsapp: C.whatsapp, danger: '#FEE4E2', white: '#fff', ghost: C.primarySoft }[variant];
  const fg = { primary: '#fff', accent: '#fff', outline: C.primary, whatsapp: '#fff', danger: '#B42318', white: C.primary, ghost: C.primary }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, small && { paddingVertical: 7, paddingHorizontal: 12 }, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: C.primary }, style]}
    >
      {icon && <Icon name={icon} size={small ? 15 : 18} color={fg} />}
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, dot, icon }: { label: string; active?: boolean; onPress?: () => void; dot?: string; icon?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
      {dot && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot, borderWidth: 1, borderColor: '#D0D5DD' }} />}
      {icon && <Icon name={icon} size={15} color={active ? '#fff' : C.primary} />}
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ltr, ...props }: TextInputProps & { label: string; hint?: string; ltr?: boolean }) {
  const { rtl } = useI18n();
  const right = rtl && !ltr;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#98A2B3"
        {...props}
        style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, { textAlign: right ? 'right' : 'left', writingDirection: right ? 'rtl' : 'ltr' }, props.style]}
      />
      {hint ? <Text style={[s.muted, { marginTop: 4, fontSize: 12 }]}>{hint}</Text> : null}
    </View>
  );
}

export function LangSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  if (compact) {
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {LANGS.map((l) => (
          <Pressable key={l} onPress={() => setLang(l)} style={[s.langPill, l === lang && { backgroundColor: C.accent }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: l === lang ? '#fff' : C.text }}>{l === 'en' ? 'EN' : LANG_LABEL[l]}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={s.row}>
      {LANGS.map((l) => <Chip key={l} label={LANG_LABEL[l]} active={l === lang} onPress={() => setLang(l)} />)}
    </View>
  );
}

export function SearchBox({ initial = '', onSubmit, autoFocus }: { initial?: string; onSubmit?: (q: string) => void; autoFocus?: boolean }) {
  const { t, rtl } = useI18n();
  const [q, setQ] = useState(initial);
  const go = () => (onSubmit ? onSubmit(q) : router.push({ pathname: '/search', params: { q } }));
  return (
    <View style={s.search}>
      <View style={{ flexShrink: 0 }}><Icon name="search" size={18} color={C.muted} /></View>
      <TextInput
        value={q}
        onChangeText={setQ}
        onSubmitEditing={go}
        returnKeyType="search"
        autoFocus={autoFocus}
        placeholder={t('search')}
        placeholderTextColor="#98A2B3"
        style={{ flex: 1, minWidth: 0, width: '100%', fontSize: 14, color: C.text, paddingVertical: 9, textAlign: rtl ? 'right' : 'left', outlineStyle: 'none' } as object}
      />
    </View>
  );
}

function IconBadge({ icon, count, href, label }: { icon: IconName; count: number; href: string; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityLabel={label} style={{ padding: 8 }}>
        <Icon name={icon} size={23} color={C.primary} />
        {count > 0 && <View style={s.badge}><Text style={s.badgeText}>{count}</Text></View>}
      </Pressable>
    </Link>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', direction: 'ltr', gap: 6 } as object}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="machines" size={18} color="#fff" strokeWidth={2.2} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: light ? '#fff' : C.primary }}>
          Printing<Text style={{ color: C.accent, fontWeight: '800', fontSize: 20 }}>IQ</Text>
        </Text>
      </Pressable>
    </Link>
  );
}

/** Website header for desktop: contact/language bar, then logo, nav, search, favorites, quote list and account. */
export function WebHeader() {
  const { t } = useI18n();
  const { favorites, quote, unread, me } = useStore();
  const nav: [StringKey, string][] = [['home', '/'], ['categories', '/categories'], ['allProducts', '/search'], ['sell', '/sell']];
  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: C.border }}>
      <View style={{ backgroundColor: C.accentSoft }}>
        <View style={[s.wrap, { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 16 }]}>
          <LangSwitcher compact />
          <RateBadge />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="whatsapp" size={15} color={C.success} />
            <Text style={{ fontSize: 12, color: C.text, direction: 'ltr' } as object}>+{SUPPORT_PHONE}</Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.wrap, { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 10 }]}>
        <Logo />
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {nav.map(([k, href]) => (
            <Link key={k} href={href as never} asChild>
              <Pressable style={s.navLink}><Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{t(k)}</Text></Pressable>
            </Link>
          ))}
        </View>
        <View style={{ flex: 1 }}><SearchBox /></View>
        <IconBadge icon="heart" count={favorites.length} href="/favorites" label={t('favorites')} />
        <IconBadge icon="cart" count={quote.length} href="/quote" label={t('quoteList')} />
        <Link href="/account" asChild>
          <Pressable style={flat(s.navLink, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primarySoft })}>
            <Icon name={me ? 'store' : 'user'} size={18} color={C.primary} />
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{me ? me.name : t('vendorAccount')}</Text>
            {unread > 0 && <View style={[s.badge, { position: 'relative', top: 0, end: 0 }]}><Text style={s.badgeText}>{unread}</Text></View>}
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export function Footer() {
  const { t, tl } = useI18n();
  return (
    <View style={{ backgroundColor: C.primary, marginTop: 32 }}>
      <View style={[s.wrap, { flexDirection: 'row', flexWrap: 'wrap', gap: 40, paddingVertical: 36 }]}>
        <View style={{ flex: 1.3, minWidth: 220, gap: 10 }}>
          <Logo light />
          <Text style={{ color: '#C9D6E8', lineHeight: 24, fontSize: 13 }}>{t('footerAbout')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="phone" size={15} color="#fff" />
            <Text style={{ color: '#fff', direction: 'ltr', fontSize: 13 } as object}>+{SUPPORT_PHONE}</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 160, gap: 8 }}>
          <Text style={s.footHead}>{t('quickLinks')}</Text>
          {([['home', '/'], ['allProducts', '/search'], ['sell', '/sell'], ['quoteList', '/quote'], ['vendorAccount', '/account']] as [StringKey, string][]).map(([k, h]) => (
            <Link key={k} href={h as never}><Text style={s.footLink}>{t(k)}</Text></Link>
          ))}
        </View>
        <View style={{ flex: 1.5, minWidth: 220, gap: 8 }}>
          <Text style={s.footHead}>{t('categories')}</Text>
          {GROUPS.map((g) => <Link key={g.id} href={`/category/${g.id}`}><Text style={s.footLink}>{tl(g.name)}</Text></Link>)}
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: '#2B527F', paddingVertical: 14 }}>
        <Text style={{ color: '#9FB3CC', textAlign: 'center', fontSize: 12 }}>© {new Date().getFullYear()} PrintingIQ</Text>
        <Pressable onPress={() => Linking.openURL('https://www.exchangerate-api.com')} accessibilityRole="link">
          <Text style={{ color: '#7F96B2', textAlign: 'center', fontSize: 11, marginTop: 4 }}>{t('ratesBy')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Home banner slides: the PrintingIQ photo, then three photo slides explaining how the site works. */
const HERO_SLIDES: { img: number; href: string; text?: { title: StringKey; sub: StringKey; cta: StringKey } }[] = [
  { img: require('../../assets/hero-banner.jpg'), href: '/categories' },
  { img: require('../../assets/hero-browse.jpg'), href: '/categories', text: { title: 'hero1Title', sub: 'hero1Sub', cta: 'hero1Cta' } },
  { img: require('../../assets/hero-contact.jpg'), href: '/search', text: { title: 'hero2Title', sub: 'hero2Sub', cta: 'hero2Cta' } },
  { img: require('../../assets/hero-sell.jpg'), href: '/sell', text: { title: 'hero3Title', sub: 'hero3Sub', cta: 'hero3Cta' } },
];

export function HeroSlider() {
  const { t, arrow } = useI18n();
  const wide = useWide();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);
  const sl = HERO_SLIDES[i];
  const frame = { width: '100%', aspectRatio: wide ? 2.6 : 1.6, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1D2B3A' } as const;
  // Explicit width/height: on web a bundled image otherwise keeps its own pixel size.
  const photo = <Image source={sl.img} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />;
  return (
    <View>
      {sl.text ? (
        <View style={frame}>
          {photo}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,28,52,0.7)' }} />
          <View style={{ flex: 1, justifyContent: 'center', gap: wide ? 12 : 8, padding: wide ? 40 : 18, maxWidth: wide ? 640 : undefined }}>
            <Text style={{ color: '#fff', fontSize: wide ? 32 : 19, fontWeight: '800', lineHeight: wide ? 52 : 32 }}>{t(sl.text.title)}</Text>
            <Text numberOfLines={3} style={{ color: '#E4ECF5', fontSize: wide ? 16 : 13, lineHeight: wide ? 28 : 22 }}>{t(sl.text.sub)}</Text>
            <Link href={sl.href as never} asChild>
              <Pressable style={flat(s.btn, { backgroundColor: C.accent, alignSelf: 'flex-start', marginTop: wide ? 8 : 2 })}>
                <Text style={[s.btnText, { color: '#fff' }]}>{t(sl.text.cta)} {arrow}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      ) : (
        <Link href={sl.href as never} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="PrintingIQ" style={frame}>{photo}</Pressable>
        </Link>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {HERO_SLIDES.map((_, k) => (
          <Pressable key={k} onPress={() => setI(k)} accessibilityLabel={`${k + 1}`} hitSlop={6}
            style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? C.primary : '#C9CED6' }} />
        ))}
      </View>
    </View>
  );
}

export function Swatches({ colors, size = 22, selected, onToggle }: {
  colors: ColorOption[]; size?: number; selected?: string[]; onToggle?: (c: ColorOption) => void;
}) {
  const { tl } = useI18n();
  return (
    <View style={[s.row, { gap: size < 16 ? 4 : 8 }]}>
      {colors.map((c) => {
        const on = selected?.includes(c.hex);
        return (
          <Pressable key={c.hex} onPress={onToggle ? () => onToggle(c) : undefined} accessibilityLabel={tl(c.name)}
            style={{ alignItems: 'center', width: onToggle ? 58 : undefined }}>
            <View style={{
              width: size, height: size, borderRadius: size / 2, backgroundColor: c.hex,
              borderWidth: on ? 3 : 1, borderColor: on ? C.accent : '#D0D5DD',
            }} />
            {onToggle || size > 22 ? <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{tl(c.name)}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Product image, or a placeholder built from the category icon and the product's colors. */
export function ProductThumb({ product, height }: { product: Product; height: number }) {
  if (product.images[0]) return <Image source={{ uri: product.images[0] }} style={{ height, width: '100%', backgroundColor: '#fff' }} resizeMode="contain" />;
  const stripes = product.colors.slice(0, 6);
  return (
    <View style={{ height, backgroundColor: tintOf(product.categoryId), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={product.categoryId} size={Math.round(height * 0.36)} color={C.primary} strokeWidth={1.3} />
      {stripes.length > 0 && (
        <View style={{ position: 'absolute', bottom: 0, start: 0, end: 0, height: 6, flexDirection: 'row' }}>
          {stripes.map((c) => <View key={c.hex} style={{ flex: 1, backgroundColor: c.hex }} />)}
        </View>
      )}
    </View>
  );
}

export function AvailabilityBadge({ product }: { product: Product }) {
  const { t } = useI18n();
  if (product.availability === 'in_stock') return null;
  const out = product.availability === 'out_of_stock';
  return (
    <View style={[s.availBadge, { backgroundColor: out ? C.danger : C.accent }]}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{out ? t('outOfStock') : t('customOrder')}</Text>
    </View>
  );
}

export function FavButton({ id, style }: { id: string; style?: ViewStyle }) {
  const { favorites, toggleFavorite } = useStore();
  const on = favorites.includes(id);
  return (
    <Pressable onPress={() => toggleFavorite(id)} hitSlop={8} style={[s.favBtn, style]} accessibilityLabel="favorite">
      <Icon name="heart" size={16} color={on ? C.accent : C.muted} strokeWidth={on ? 2.6 : 1.8} />
    </Pressable>
  );
}

export const cityName = (city: string, tl: ReturnType<typeof useI18n>['tl']) => {
  const c = CITIES.find((x) => x.en === city);
  return c ? tl(c) : city;
};

/** "Shop name ✓ · City" line used on cards. */
export function VendorLine({ vendor, small }: { vendor?: Vendor; small?: boolean }) {
  const { tl } = useI18n();
  if (!vendor) return null;
  return (
    <Link href={`/vendor/${vendor.id}`} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="store" size={small ? 12 : 14} color={C.muted} />
        <Text numberOfLines={1} style={{ fontSize: small ? 11 : 13, color: C.muted, flexShrink: 1 }}>
          {vendor.name}{vendor.city ? ` · ${cityName(vendor.city, tl)}` : ''}
        </Text>
        {vendor.verified && <Icon name="verified" size={small ? 12 : 14} color={C.success} />}
      </Pressable>
    </Link>
  );
}

/** "Dollar rate today: $1 = 1,515 IQD · 2026-11-25", linking to the rate source (its terms ask for the link). */
export function RateBadge({ light }: { light?: boolean }) {
  const { t, lang } = useI18n();
  const { exchange } = useStore();
  if (!exchange.date) return null;
  const color = light ? '#DCE6F2' : C.muted;
  return (
    <Pressable
      onPress={exchange.sourceUrl ? () => Linking.openURL(exchange.sourceUrl!) : undefined}
      accessibilityLabel={exchange.manual ? t('rateManual') : t('ratesBy')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
    >
      <Icon name="refresh" size={13} color={color} />
      <Text style={{ fontSize: 12, color }}>{t('dollarRate')}:</Text>
      <Text style={{ fontSize: 12, color: light ? '#fff' : C.text, fontWeight: '700', direction: 'ltr' } as object}>{formatRate(exchange, lang)}</Text>
      <Text style={{ fontSize: 11, color }}>· {shortDate(exchange.date)}</Text>
    </Pressable>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { t, tl, lang } = useI18n();
  const { addToQuote, quote, vendors, exchange } = useStore();
  const price = formatPrice(product, lang);
  const alt = formatConverted(product, exchange, lang);
  const inQuote = quote.some((q) => q.productId === product.id);
  const out = product.availability === 'out_of_stock';
  return (
    <View style={s.card}>
      <Link href={`/product/${product.id}`} asChild>
        <Pressable style={{ flex: 1 }}>
          <ProductThumb product={product} height={130} />
          <View style={{ paddingHorizontal: 10, paddingTop: 8, gap: 3 }}>
            <Text numberOfLines={2} style={s.cardTitle}>{tl(product.name)}</Text>
            {product.sku ? <Text style={s.code}>{t('code')}: {product.sku}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 16, gap: 6 }}>
              <Swatches colors={product.colors.slice(0, 6)} size={11} />
              {product.stockQty != null && <Text style={{ fontSize: 11, color: C.muted }}>{product.stockQty} {t('qty')}</Text>}
            </View>
          </View>
        </Pressable>
      </Link>
      <View style={{ paddingHorizontal: 10, paddingTop: 4 }}><VendorLine vendor={vendors[product.vendorId]} small /></View>
      <View style={s.cardFoot}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.price} numberOfLines={1}>
            {price ?? t('askPrice')}
            {price ? <Text style={{ fontSize: 10, color: C.muted }}> / {t(unitKey(product.unit))}</Text> : null}
          </Text>
          {alt ? <Text numberOfLines={1} style={{ fontSize: 11, color: C.muted, lineHeight: 18 }}>{alt}</Text> : null}
        </View>
        <Pressable
          disabled={out}
          onPress={() => addToQuote(product.id, product.minOrder ?? 1)}
          accessibilityLabel={t('addToQuote')}
          style={[s.cartBtn, inQuote && { backgroundColor: C.success }, out && { opacity: 0.35 }]}
        >
          <Icon name={inQuote ? 'check' : 'cart'} size={16} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>
      <AvailabilityBadge product={product} />
      <FavButton id={product.id} style={{ position: 'absolute', top: 8, end: 8 }} />
    </View>
  );
}

export function useColumns(min = 2) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, MAX_W);
  return Math.max(min, w > 1100 ? 5 : w > 860 ? 4 : w > 560 ? 3 : 2);
}

export function ProductGrid({ products }: { products: Product[] }) {
  const cols = useColumns();
  const { t } = useI18n();
  if (!products.length) return <Muted style={{ padding: 16 }}>{t('noProducts')}</Muted>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
      {products.map((p) => (
        <View key={p.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
          <ProductCard product={p} />
        </View>
      ))}
    </View>
  );
}

/** Large tile for a main category group: tinted icon area with a label bar underneath. */
export function GroupTile({ group, count }: { group: Group; count?: number }) {
  const { tl } = useI18n();
  return (
    <Link href={`/category/${group.id}`} asChild>
      <Pressable style={flat(s.groupTile)}>
        <View style={{ height: 104, backgroundColor: group.tint, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={group.id} size={32} color={C.primary} strokeWidth={1.6} />
          </View>
        </View>
        <View style={{ backgroundColor: '#F1F3F6', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ fontWeight: '700', color: C.text, fontSize: 13 }}>{tl(group.name)}</Text>
          {count != null && <Text style={{ color: C.muted, fontSize: 11 }}>{count}</Text>}
        </View>
      </Pressable>
    </Link>
  );
}

/** Small tile for a subcategory: icon + name. */
export function SubTile({ category, count }: { category: Category; count?: number }) {
  const { tl } = useI18n();
  return (
    <Link href={`/category/${category.id}`} asChild>
      <Pressable style={flat(s.subTile)}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: tintOf(category.id), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={category.id} size={26} color={C.primary} strokeWidth={1.6} />
        </View>
        <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '600', color: C.text, textAlign: 'center' }}>{tl(category.name)}</Text>
        {count ? <Text style={{ fontSize: 10, color: C.muted }}>{count}</Text> : null}
      </Pressable>
    </Link>
  );
}

export function VendorCta() {
  const { t } = useI18n();
  const { me } = useStore();
  return (
    <View style={s.cta}>
      <View style={[s.heroBlob, { width: 180, height: 180, top: -70, start: -50, opacity: 0.12 }]} />
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="store" size={28} color="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{t('vendorCtaTitle')}</Text>
        <Text style={{ color: '#DCE6F2', fontSize: 13 }}>{t('vendorCtaBody')}</Text>
      </View>
      <Button variant="white" title={me ? t('addProduct') : t('vendorCtaButton')} onPress={() => router.push(me ? '/sell' : '/account')} />
    </View>
  );
}

/** Banner shown to a signed-in vendor the moment a customer inquiry arrives. */
export function InquiryBanner() {
  const { t } = useI18n();
  const { alert, dismissAlert } = useStore();
  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(dismissAlert, 12000);
    return () => clearTimeout(id);
  }, [alert, dismissAlert]);
  if (!alert) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, start: 0, end: 0, alignItems: 'center', zIndex: 100 }}>
      <Pressable
        onPress={() => { dismissAlert(); router.push('/account'); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primary, borderRadius: 14, padding: 14, maxWidth: 520, marginHorizontal: 16,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('newInquiry')}</Text>
          <Text style={{ color: '#DCE6F2', fontSize: 12 }} numberOfLines={2}>
            {alert.customerName} {t('wantsToContact')} {alert.items.map((i) => i.name).join('، ')}
          </Text>
        </View>
        <Pressable onPress={dismissAlert} hitSlop={10}><Icon name="close" size={18} color="#fff" /></Pressable>
      </Pressable>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenInner: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', padding: 16, gap: 14 },
  wrap: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: 16 },
  h: { fontSize: 17, fontWeight: '700', color: C.text },
  muted: { color: C.muted, fontSize: 13, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText: { fontWeight: '700', fontSize: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 12, color: C.text, fontWeight: '600' },
  langPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: C.card, color: C.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F6F9', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12 },
  navLink: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 8 },
  badge: { position: 'absolute', top: 2, end: 0, backgroundColor: C.accent, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderColor: C.border, marginTop: 8 },
  sectionPill: { backgroundColor: C.primarySoft, paddingVertical: 7, paddingHorizontal: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  sectionText: { fontSize: 15, fontWeight: '700', color: C.primary },
  hero: { borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', gap: 20 },
  heroBlob: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.08 },
  card: { backgroundColor: C.card, borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.border, flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: C.text, minHeight: 44, lineHeight: 22 },
  code: { fontSize: 10, color: C.muted, letterSpacing: 0.3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: 10, borderTopWidth: 1, borderColor: '#F0F1F3', marginTop: 6 },
  price: { fontSize: 14, fontWeight: '700', color: C.primary, flexShrink: 1 },
  cartBtn: { backgroundColor: C.primary, width: 36, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  favBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  availBadge: { position: 'absolute', top: 8, start: 8, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  groupTile: { borderRadius: R.md, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  subTile: { alignItems: 'center', gap: 6, padding: 8, width: 104 },
  cta: { backgroundColor: C.primary, borderRadius: 16, padding: 22, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, overflow: 'hidden', marginTop: 8 },
  footHead: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  footLink: { color: '#C9D6E8', fontSize: 13 },
  panel: { backgroundColor: C.card, borderRadius: R.md, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
});
