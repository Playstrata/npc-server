import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  experience: number;

  @Column({ name: 'experience_to_next_level', default: 100 })
  experienceToNextLevel: number;

  // 基礎屬性
  @Column({ default: 100 })
  hp: number;

  @Column({ name: 'max_hp', default: 100 })
  maxHp: number;

  @Column({ default: 50 })
  mp: number;

  @Column({ name: 'max_mp', default: 50 })
  maxMp: number;

  // 五維屬性
  @Column({ default: 10 })
  strength: number;

  @Column({ default: 10 })
  dexterity: number;

  @Column({ default: 10 })
  intelligence: number;

  @Column({ default: 10 })
  vitality: number;

  @Column({ default: 10 })
  luck: number;

  @Column({ name: 'available_stat_points', default: 0 })
  availableStatPoints: number;

  // 遊戲狀態
  @Column({ default: 0 })
  gold: number;

  @Column({ name: 'current_map', default: 'starter_town' })
  currentMap: string;

  @Column({ name: 'position_x', default: 0, type: 'float' })
  positionX: number;

  @Column({ name: 'position_y', default: 0, type: 'float' })
  positionY: number;

  @Column({ name: 'last_save_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSaveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 關聯：角色屬於某個用戶
  @ManyToOne(() => User, (user) => user.characters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // 計算屬性 (不儲存在資料庫)
  get physicalAttack(): number {
    return Math.floor(this.strength * 1.5 + this.level * 2);
  }

  get magicalAttack(): number {
    return Math.floor(this.intelligence * 1.5 + this.level * 2);
  }

  get defense(): number {
    return Math.floor(this.vitality * 1.2 + this.level * 1.5);
  }

  get accuracy(): number {
    return Math.floor(this.dexterity * 0.8 + this.level);
  }

  get evasion(): number {
    return Math.floor(this.dexterity * 0.6 + this.luck * 0.4);
  }

  get criticalRate(): number {
    return Math.min(Math.floor(this.luck * 0.3 + this.dexterity * 0.1), 50); // 最高50%
  }
}