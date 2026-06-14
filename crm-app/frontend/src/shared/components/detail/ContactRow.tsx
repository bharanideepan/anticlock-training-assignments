import { Box, Link, ListItemButton, ListItemText, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';

interface ContactRowProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    designation?: string;
    department?: string;
  };
  onClick: () => void;
}

export default function ContactRow({ contact, onClick }: ContactRowProps) {
  const subLine = [contact.designation, contact.department].filter(Boolean).join(' · ');

  return (
    <ListItemButton divider onClick={onClick} sx={{ alignItems: 'flex-start' }}>
      <ListItemText
        primary={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {contact.firstName} {contact.lastName}
          </Typography>
        }
        secondary={
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {subLine && (
              <Typography component="span" variant="caption" color="text.secondary">{subLine}</Typography>
            )}
            {contact.email && (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Link
                  href={`mailto:${contact.email}`}
                  variant="caption"
                  onClick={(e) => e.stopPropagation()}
                  underline="hover"
                >
                  {contact.email}
                </Link>
              </Box>
            )}
            {contact.phone && (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Link
                  href={`tel:${contact.phone}`}
                  variant="caption"
                  onClick={(e) => e.stopPropagation()}
                  underline="hover"
                >
                  {contact.phone}
                </Link>
              </Box>
            )}
          </Box>
        }
        slotProps={{ secondary: { component: 'span' } }}
      />
    </ListItemButton>
  );
}
