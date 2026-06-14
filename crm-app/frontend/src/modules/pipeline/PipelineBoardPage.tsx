import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  Box, CircularProgress, Stack, TextField, Typography,
} from '@mui/material';
import { usePipelineBoard, useUpdateOpportunityStage } from '../../api/pipeline.api';
import { apiClient } from '../../api/client';
import StageColumn from './StageColumn';
import OpportunityCard from './OpportunityCard';
import AsyncAutocomplete from '../../shared/components/AsyncAutocomplete';

const STAGE_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

async function fetchUserOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; firstName: string; lastName: string; email: string }[];
    meta: { totalPages: number };
  }>('/users', { params: { search, page, pageSize: 10, status: 'ACTIVE' } });
  return {
    items: data.data.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, subtitle: u.email })),
    hasMore: page < data.meta.totalPages,
  };
}

interface ActiveCard {
  id: string;
  name: string;
  expectedRevenue?: string;
  expectedCloseDate?: string;
  owner?: { id: string; firstName: string; lastName: string };
  stageId: string;
}

export default function PipelineBoardPage() {
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);

  const { data: columns, isLoading } = usePipelineBoard({
    search: search || undefined,
    ownerId: ownerId || undefined,
  });
  const moveStage = useUpdateOpportunityStage();

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as Omit<ActiveCard, 'id'> | undefined;
    if (data) {
      setActiveCard({ id: String(event.active.id), ...data });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || active.id === over.id) return;

    const currentStageId = (active.data.current as { stageId?: string } | null)?.stageId;
    const targetStageId = over.id as string;

    if (currentStageId === targetStageId) return;

    moveStage.mutate({ id: active.id as string, stageId: targetStageId });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Pipeline</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drag opportunities between stages to update their status
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          size="small"
          placeholder="Search opportunities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 240 }}
        />
        <Box sx={{ width: 220 }}>
          <AsyncAutocomplete
            label="Owner"
            value={ownerId}
            onChange={(id) => setOwnerId(id)}
            fetchOptions={fetchUserOptions}
            placeholder="All owners"
          />
        </Box>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveCard(null)}
        >
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2, minHeight: 400 }}>
            {columns?.map((col, index) => (
              <StageColumn
                key={col.stage.id}
                stageId={col.stage.id}
                stageName={col.stage.name}
                opportunities={col.opportunities}
                totalValue={col.totalValue}
                stageColor={STAGE_PALETTE[index % STAGE_PALETTE.length]}
              />
            ))}
          </Stack>
          <DragOverlay>
            {activeCard && (
              <OpportunityCard
                id={activeCard.id}
                name={activeCard.name}
                expectedRevenue={activeCard.expectedRevenue}
                expectedCloseDate={activeCard.expectedCloseDate}
                owner={activeCard.owner}
                stageId={activeCard.stageId}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </Box>
  );
}
