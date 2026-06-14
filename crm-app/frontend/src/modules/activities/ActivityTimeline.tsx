import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EmailIcon from '@mui/icons-material/Email';
import NoteIcon from '@mui/icons-material/Note';
import FollowUpIcon from '@mui/icons-material/Update';
import type { Activity, ActivityType } from '../../shared/types/api.types';

interface ActivityWithCreatedBy extends Activity {
  createdBy?: { firstName: string; lastName: string };
}

const TYPE_ICONS: Record<ActivityType, React.ReactElement> = {
  PHONE_CALL: <PhoneIcon sx={{fontSize: "small"}} />,
  MEETING: <MeetingRoomIcon sx={{fontSize: "small"}} />,
  EMAIL: <EmailIcon sx={{fontSize: "small"}} />,
  NOTE: <NoteIcon sx={{fontSize: "small"}} />,
  FOLLOW_UP: <FollowUpIcon sx={{fontSize: "small"}} />,
};

const TYPE_COLORS: Record<ActivityType, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  PHONE_CALL: 'primary',
  MEETING: 'success',
  EMAIL: 'info',
  NOTE: 'default',
  FOLLOW_UP: 'warning',
};

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
}

export default function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  if (isLoading) return <CircularProgress size={24} sx={{ m: 2 }} />;
  if (!activities.length) {
    return <Typography variant="body2" color="text.secondary">No activities recorded.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {activities.map((activity) => (
        <Box
 key={activity.id} sx={{bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2}}
 
 
 
 
 
 >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Chip
              icon={TYPE_ICONS[activity.type]}
              label={activity.type.replace('_', ' ')}
              size="small"
              color={TYPE_COLORS[activity.type]}
            />
            <Typography variant="subtitle2">{activity.subject}</Typography>
          </Stack>

          {activity.description && (
            <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}} >
              {activity.description}
            </Typography>
          )}

          <Stack direction="row" spacing={2}>
            {activity.scheduledAt && (
              <Typography variant="caption" color="text.secondary">
                {new Date(activity.scheduledAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Typography>
            )}
            {activity.durationMinutes && (
              <Typography variant="caption" color="text.secondary">
                {activity.durationMinutes} min
              </Typography>
            )}
            {(activity as ActivityWithCreatedBy).createdBy && (
              <Typography variant="caption" color="text.secondary">
                by {(activity as ActivityWithCreatedBy).createdBy?.firstName} {(activity as ActivityWithCreatedBy).createdBy?.lastName}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
