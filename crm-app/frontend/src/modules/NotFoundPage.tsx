import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh"}} >
      <Typography variant="h2" sx={{mb: 2}} >404</Typography>
      <Typography variant="h6" color="text.secondary" sx={{mb: 3}} >Page not found</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
    </Box>
  );
}
