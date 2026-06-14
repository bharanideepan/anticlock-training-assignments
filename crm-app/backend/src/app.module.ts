import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { MetricsMiddleware } from './common/middleware/metrics.middleware';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { SearchModule } from './modules/search/search.module';
import { AuditModule } from './modules/audit/audit.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot(loggerConfig),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    CustomersModule,
    ContactsModule,
    ActivitiesModule,
    OpportunitiesModule,
    PipelineModule,
    TasksModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    FilesModule,
    SearchModule,
    AuditModule,
    ImportExportModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
