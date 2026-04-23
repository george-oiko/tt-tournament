import { Pipe, PipeTransform } from '@angular/core';
import { EventType } from '../../core/models';

const LABELS: Record<EventType, string> = {
  groups:          'Groups Only',
  knockout:        'Knockout Only',
  groups_knockout: 'Groups + Knockout',
};

@Pipe({ name: 'eventTypeLabel', standalone: true })
export class EventTypeLabelPipe implements PipeTransform {
  transform(value: EventType | string | null | undefined): string {
    return LABELS[value as EventType] ?? value ?? '';
  }
}
