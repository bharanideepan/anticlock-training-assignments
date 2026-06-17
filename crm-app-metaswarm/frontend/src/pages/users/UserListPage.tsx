import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../api/users';
import type { UserListParams } from '../../api/users';

export default function UserListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';

  const [params, setParams] = useState<UserListParams>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useUsers(params);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setParams((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }));
    },
    [],
  );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>
          Users
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            onClick={() => navigate('/users/new')}
          >
            Create User
          </Button>
        )}
      </Box>

      <Box mb={2}>
        <TextField
          placeholder="Search by name or email"
          size="small"
          onChange={handleSearch}
        />
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Teams</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <TableCell>{`${u.firstName} ${u.lastName}`}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role.name}</TableCell>
                  <TableCell>{u.teams.map((t) => t.name).join(', ')}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.status}
                      size="small"
                      color={u.status === 'ACTIVE' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
