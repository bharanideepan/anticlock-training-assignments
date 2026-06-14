import { Box, Typography, Divider } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box sx={{mb: 3}} >
      <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}} >
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}} >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box>{actions}</Box>}
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}
