import React, { useState } from 'react';
import { Box, Checkbox, Typography, IconButton, List, ListItem, ListItemText, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { TimeSeriesProvider } from '../../../types/ProcessedData';

interface DeprecatedModelsPanelProps {
  deprecatedProviders: TimeSeriesProvider[];
  selectedProviders: Set<string>;
  onToggle: (providerCanonical: string) => void;
  modelName: string;
}

export const DeprecatedModelsPanel: React.FC<DeprecatedModelsPanelProps> = ({
  deprecatedProviders,
  selectedProviders,
  onToggle,
  modelName,
}) => {
  const [expanded, setExpanded] = useState(true);
  const listId = `deprecated-providers-${modelName.replace(/\s+/g, '-')}`;

  if (deprecatedProviders.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 220 },
        borderLeft: { xs: 'none', sm: '1px solid #ddd' },
        borderTop: { xs: '1px solid #ddd', sm: 'none' },
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Header */}
      <Box
        component="button"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: '1px solid #ddd',
          border: 'none',
          width: '100%',
          cursor: 'pointer',
          backgroundColor: '#f5f5f5',
          '&:hover': {
            backgroundColor: '#eeeeee',
          },
          '&:focus': {
            outline: '2px solid #1976d2',
            outlineOffset: '-2px',
          },
        }}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        aria-expanded={expanded}
        aria-controls={listId}
        type="button"
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#666',
          }}
        >
          Deprecated ({deprecatedProviders.length})
        </Typography>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }} aria-hidden="true">
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>

      {/* Expandable content */}
      {expanded && (
        <List dense sx={{ p: 0 }} id={listId}>
          {deprecatedProviders.map((provider) => {
            const isChecked = selectedProviders.has(provider.providerCanonical);

            const tooltipContent = [
              provider.deprecation_date && `Deprecated: ${provider.deprecation_date}`,
              provider.successor_model && `Successor: ${provider.successor_model}`,
              provider.last_benchmark_date && `Last data: ${new Date(provider.last_benchmark_date).toLocaleDateString()}`,
            ].filter(Boolean).join('\n');

            return (
              <ListItem
                key={provider.providerCanonical}
                sx={{
                  py: 0.5,
                  px: 1,
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
                role="checkbox"
                aria-checked={isChecked}
                aria-label={`Toggle ${provider.provider} deprecated data`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(provider.providerCanonical);
                  }
                }}
              >
                <Checkbox
                  size="small"
                  checked={isChecked}
                  onChange={() => onToggle(provider.providerCanonical)}
                  sx={{
                    padding: 0.5,
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                  }}
                />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.8rem',
                          color: isChecked ? '#333' : '#999',
                        }}
                      >
                        {provider.provider}
                      </Typography>
                      {tooltipContent && (
                        <Tooltip title={tooltipContent} arrow>
                          <InfoOutlinedIcon sx={{ fontSize: 14, color: '#999', cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={
                    provider.last_benchmark_date && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.7rem',
                          color: '#999',
                          fontStyle: 'italic',
                        }}
                      >
                        {new Date(provider.last_benchmark_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    )
                  }
                  sx={{ ml: 0.5 }}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};
