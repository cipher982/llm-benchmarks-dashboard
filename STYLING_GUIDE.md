# Styling Guide

This document outlines the styling architecture and conventions for the LLM Benchmarks Dashboard.

## Architecture Overview

### Theme System (`frontend/src/theme/theme.ts`)

The application uses Material-UI's theming system with comprehensive design tokens:

#### Core Theme Structure
- **Mode**: Light theme with consistent color palette
- **Primary Color**: `#663399` (purple)
- **Typography**: Roboto font family with structured scale
- **Spacing**: 8px base unit with consistent scale
- **Breakpoints**: Standard Material-UI breakpoints (xs, sm, md, lg, xl)
- **Shape**: 8px border radius default

#### Provider Colors
Provider-specific colors are integrated into the theme palette under `theme.palette.providers`:
```typescript
// Access provider colors through the theme
const color = getProviderColor(theme, Provider.Anthropic);
```

### Styled Components (`frontend/src/components/StyledComponents.tsx`)

Reusable styled components for common patterns:

#### Loading Components
- `LoadingContainer`: Full-screen loading layout
- `ChartLoadingContainer`: Chart-specific loading layout  
- `StyledCircularProgress`: Themed progress indicator

#### Layout Components
- `CenteredContentContainer`: Max-width centered content
- `FlexContainer`: Flexible responsive layouts
- `FlexItem`: Flex items with responsive behavior

#### Section Components
- `StyledDescriptionSection`: Consistent section styling
- `StyledChartContainer`: Chart wrapper with consistent padding/borders
- `StyledTableContainer`: Table wrapper with consistent styling

## Best Practices

### 1. Always Use Theme Values

❌ **Don't use hard-coded values:**
```typescript
const BadComponent = styled('div')({
  backgroundColor: '#663399',
  padding: '20px',
  borderRadius: '10px',
});
```

✅ **Use theme values:**
```typescript
const GoodComponent = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
}));
```

### 2. Responsive Design

❌ **Don't use hard-coded breakpoints:**
```typescript
const isMobile = useMediaQuery('(max-width:500px)');
```

✅ **Use theme breakpoints:**
```typescript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
```

### 3. Component Styling Hierarchy

1. **Theme-based styled components** (preferred)
2. **Material-UI sx prop** (for small tweaks)
3. **Inline styles** (avoid, only for dynamic values)

### 4. Color Usage

❌ **Don't use hard-coded colors:**
```typescript
style={{ color: '#663399', backgroundColor: 'white' }}
```

✅ **Use theme colors:**
```typescript
sx={{ 
  color: 'primary.main', 
  backgroundColor: 'background.default' 
}}
```

For provider colors:
```typescript
const theme = useTheme();
const color = getProviderColor(theme, provider);
```

### 5. Spacing and Layout

Use theme spacing units consistently:
```typescript
// 8px increments
theme.spacing(1) // 8px
theme.spacing(2) // 16px
theme.spacing(3) // 24px
```

## Common Patterns

### Page Layout
```typescript
import { 
  StyledDescriptionSection,
  StyledChartContainer,
  StyledTableContainer,
  CenteredContentContainer,
  PageTitle 
} from '../components/StyledComponents';

const MyPage = () => (
  <MainContainer isMobile={isMobile}>
    <StyledDescriptionSection isMobile={isMobile}>
      <CenteredContentContainer>
        <PageTitle>My Page Title</PageTitle>
        <p>Description content...</p>
      </CenteredContentContainer>
    </StyledDescriptionSection>
    
    <StyledChartContainer isMobile={isMobile}>
      {/* Chart content */}
    </StyledChartContainer>
  </MainContainer>
);
```

### Loading States
```typescript
import { LoadingContainer, StyledCircularProgress } from '../components/StyledComponents';

const LoadingState = () => (
  <LoadingContainer>
    <StyledCircularProgress size={80} />
  </LoadingContainer>
);
```

### Chart Styling
Charts should use theme colors through the `getProviderColor` helper:
```typescript
import { useTheme } from '@mui/material/styles';
import { getProviderColor, Provider } from '../../theme/theme';

const ChartComponent = () => {
  const theme = useTheme();
  
  return (
    <SomeChart
      data={data}
      colors={data.map(item => getProviderColor(theme, item.provider))}
      textColor={theme.palette.text.primary}
      gridColor={theme.palette.divider}
    />
  );
};
```

## File Organization

```
frontend/src/
├── theme/
│   └── theme.ts              # Main theme configuration
├── components/
│   └── StyledComponents.tsx  # Reusable styled components
├── styles.ts                 # Legacy styled components (being phased out)
├── index.css                 # Global styles & utility classes
└── pages/                    # Page components using styled components
```

## Accessibility

Use the `.sr-only` class for screen-reader-only content:
```html
<span className="sr-only">Screen reader only text</span>
```

Legacy classes `.peekaboo` and `.no-visual` are maintained for backwards compatibility.

## Migration Notes

When updating existing components:

1. Replace hard-coded colors with theme values
2. Use reusable styled components from `StyledComponents.tsx`
3. Replace inline styles with styled components
4. Update media queries to use theme breakpoints
5. Ensure provider colors use `getProviderColor()` helper

## Theme Customization

To modify the theme:

1. **Colors**: Update palette values in `theme.ts`
2. **Spacing**: Modify the spacing function (default: 8px base)
3. **Typography**: Update typography scale in theme configuration
4. **Breakpoints**: Adjust breakpoint values if needed
5. **Provider Colors**: Add/modify colors in the providers palette

The theme system ensures consistent styling across the entire application while maintaining flexibility for customization.