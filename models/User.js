const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 定義 User 模型
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '使用者名稱為必填'],
    unique: true,
    trim: true,
    minlength: [3, '使用者名稱至少需要3個字元'],
    maxlength: [20, '使用者名稱不能超過20個字元']
  },
  email: {
    type: String,
    required: [true, '電子郵件為必填'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '請輸入有效的電子郵件']
  },
  password: {
    type: String,
    required: [true, '密碼為必填'],
    minlength: [6, '密碼至少需要6個字元']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 新增 practices 欄位
  practices: [
    {
      createdAt: {
        type: Date,
        default: Date.now // 每個練習的創建時間
      },
      scenario: {
        type: String, // 儲存情境內容
      },
      technique: {
        type: String, // 溝通技巧名稱
        required: [true, '溝通技巧為必填']
      },
      history: [
        {
          role: {
            type: String, // 角色：如 "家長" 或 "導師"
            enum: ['家長', '導師'], // 僅限這兩個值
            required: [true, '角色為必填']
          },
          content: {
            type: String, // 聊天內容
            required: [true, '聊天內容為必填']
          }
        }
      ],
      recordings: [
        {
          timestamp: {
            type: Date, // 錄音的時間戳
            default: Date.now
          },
          path: {
            type: String, // 錄音檔案的路徑
            required: [true, '錄音檔案路徑為必填']
          },
          transcription: {
            type: String // 錄音文字轉譯（選填）
          }
        }
      ],
      analysis: {
        type: String // 分析結果文字（選填）
      }
    }
  ]
});

// 密碼雜湊中間件
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 驗證密碼的方法
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
