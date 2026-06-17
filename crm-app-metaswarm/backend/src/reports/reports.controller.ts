import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

const REPORT_ROLES = [RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER, RoleName.SALES_REPRESENTATIVE];

@ApiTags('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...REPORT_ROLES)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/revenue')
  @ApiOperation({ summary: 'Sales revenue performance' })
  async salesRevenue(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.salesRevenue(actor, query) };
  }

  @Get('sales/win-rate')
  @ApiOperation({ summary: 'Sales win rate analysis' })
  async salesWinRate(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.salesWinRate(actor, query) };
  }

  @Get('sales/conversion-rate')
  @ApiOperation({ summary: 'Sales conversion rate funnel' })
  async salesConversionRate(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.salesConversionRate(actor, query) };
  }

  @Get('sales/opportunity-trends')
  @ApiOperation({ summary: 'Sales opportunity trends by period' })
  async salesOpportunityTrends(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.salesOpportunityTrends(actor, query) };
  }

  @Get('customers/growth')
  @ApiOperation({ summary: 'Customer growth by period' })
  async customersGrowth(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.customersGrowth(actor, query) };
  }

  @Get('customers/distribution')
  @ApiOperation({ summary: 'Customer distribution by status and revenue range' })
  async customersDistribution(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.customersDistribution(actor, query) };
  }

  @Get('customers/industry-analysis')
  @ApiOperation({ summary: 'Customer distribution by industry' })
  async customersIndustryAnalysis(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.customersIndustryAnalysis(actor, query) };
  }

  @Get('productivity/activity-completion')
  @ApiOperation({ summary: 'Activity completion report' })
  async productivityActivityCompletion(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.productivityActivityCompletion(actor, query) };
  }

  @Get('productivity/task-completion')
  @ApiOperation({ summary: 'Task completion report' })
  async productivityTaskCompletion(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.productivityTaskCompletion(actor, query) };
  }

  @Get('productivity/opportunity-ownership')
  @ApiOperation({ summary: 'Opportunity ownership by user' })
  async productivityOpportunityOwnership(@Query() query: ReportQueryDto, @CurrentUser() actor: ActorPayload) {
    return { data: await this.reportsService.productivityOpportunityOwnership(actor, query) };
  }

  @Get(':reportType/export')
  @ApiOperation({ summary: 'Export report as CSV' })
  async exportCsv(
    @Param('reportType') reportType: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() actor: ActorPayload,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportCsv(reportType, actor, query);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportType}-${date}.csv"`);
    res.send(csv);
  }
}
