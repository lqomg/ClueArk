import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { UsersService } from '../users/users.service';
import { MonitorsService } from '../monitors/monitors.service';
import type { ListAdminMonitorsQueryDto } from './dto/list-admin-monitors.query.dto';

function notDeletedFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type AdminMonitorOwner = {
  id: string;
  email: string;
  username: string;
};

export type AdminMonitorListItem = {
  id: string;
  title: string;
  topicPrompt: string;
  userId: string;
  owner: AdminMonitorOwner;
  sourceCount: number;
  snapshotStatus: string;
  snapshotComputedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminMonitorDetail = AdminMonitorListItem & {
  description: string;
  keywords: string[];
  entities: string[];
  sourceIds: string[];
  minCosine: number;
};

@Injectable()
export class MonitorsAdminService {
  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly usersService: UsersService,
    private readonly monitorsService: MonitorsService,
  ) {}

  async list(query: ListAdminMonitorsQueryDto): Promise<{
    items: AdminMonitorListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const filter: Record<string, unknown> = { ...notDeletedFilter() };

    if (query.status) {
      filter.snapshotStatus = query.status;
    }
    if (query.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.ownerEmail?.trim()) {
      const ownerIds = await this.usersService.findIdsByEmailSearch(query.ownerEmail);
      if (!ownerIds.length) {
        return { items: [], total: 0, page, pageSize };
      }
      filter.userId = { $in: ownerIds.map((id) => new Types.ObjectId(id)) };
    }
    const search = query.search?.trim();
    if (search) {
      const esc = escapeRegex(search);
      filter.$or = [{ title: new RegExp(esc, 'i') }, { topicPrompt: new RegExp(esc, 'i') }];
    }

    const [docs, total] = await Promise.all([
      this.monitorModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean().exec(),
      this.monitorModel.countDocuments(filter).exec(),
    ]);

    const userIds = [...new Set(docs.map((d) => String(d.userId)))];
    const owners = await this.usersService.findManyByIds(userIds);
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    const items = docs.map((d) => this.toListItem(d, ownerMap.get(String(d.userId))));
    return { items, total, page, pageSize };
  }

  async getOne(monitorId: string): Promise<AdminMonitorDetail> {
    if (!Types.ObjectId.isValid(monitorId)) {
      throw new NotFoundException('monitor_not_found');
    }
    const doc = await this.monitorModel
      .findOne({ _id: new Types.ObjectId(monitorId), ...notDeletedFilter() })
      .lean()
      .exec();
    if (!doc) {
      throw new NotFoundException('monitor_not_found');
    }
    const owners = await this.usersService.findManyByIds([String(doc.userId)]);
    const owner = owners[0];
    const base = this.toListItem(doc, owner);
    const kw = doc.keywords;
    const ent = doc.entities;
    const sourceIds = (doc.sourceIds as Types.ObjectId[] | undefined) ?? [];
    const mc = doc.minCosine;
    return {
      ...base,
      description: String(doc.description ?? ''),
      keywords: Array.isArray(kw) ? kw.map((x) => String(x).trim()).filter(Boolean) : [],
      entities: Array.isArray(ent) ? ent.map((x) => String(x).trim()).filter(Boolean) : [],
      sourceIds: sourceIds.map((x) => String(x)),
      minCosine: typeof mc === 'number' && Number.isFinite(mc) ? Math.min(1, Math.max(0, mc)) : 0.43,
    };
  }

  async softDelete(monitorId: string): Promise<void> {
    await this.monitorsService.softDeleteForAdmin(monitorId);
  }

  private toListItem(
    doc: Record<string, unknown>,
    owner?: { id: string; email: string; username: string },
  ): AdminMonitorListItem {
    const userId = String(doc.userId ?? '');
    const sourceIds = (doc.sourceIds as unknown[] | undefined) ?? [];
    const computedAt = doc.snapshotComputedAt;
    return {
      id: String(doc._id),
      title: String(doc.title ?? ''),
      topicPrompt: String(doc.topicPrompt ?? ''),
      userId,
      owner: owner ?? { id: userId, email: '', username: '' },
      sourceCount: sourceIds.length,
      snapshotStatus: String(doc.snapshotStatus ?? 'pending'),
      snapshotComputedAt:
        computedAt instanceof Date ? computedAt.toISOString() : computedAt ? String(computedAt) : null,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ''),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ''),
    };
  }
}
