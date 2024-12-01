const User = require('../models/User');

/**
 * 更新指定練習的資料
 * @param {String} userId 使用者 ID
 * @param {String} practiceId 練習 ID
 * @param {Object} updates 要更新的資料
 * @returns {Object} 更新後的練習物件
 */
async function updatePractice(practiceId, updates) {
  try {
    console.log('Updating practice with:', {
      practiceId,
      updates
    });

    // 確保 updates 是一個物件而不是字串
    const updatesObj = typeof updates === 'string' ? { content: updates } : updates;

    // 尋找包含指定練習 ID 的使用者
    const user = await User.findOne({ 'practices._id': practiceId });
    if (!user) {
      console.error('Practice not found for ID:', practiceId);
      throw new Error('練習不存在');
    }

    // 找到對應的練習
    const practice = user.practices.id(practiceId);
    if (!practice) {
      console.error('Practice not found in user document');
      throw new Error('練習不存在');
    }

    // 處理歷史記錄更新
    if (updatesObj.history) {
      if (!Array.isArray(practice.history)) {
        practice.history = [];
      }
      practice.history = [...practice.history, ...updatesObj.history];
    }

    // 處理情境和建議更新
    if (updatesObj.scenario) {
      practice.scenario = updatesObj.scenario;
    }
    if (updatesObj.teacherSuggestion) {
      practice.teacherSuggestion = updatesObj.teacherSuggestion;
    }

    // 處理其他更新欄位
    if (updatesObj.analysis) {
      practice.analysis = updatesObj.analysis;
    }
    if (updatesObj.recordings) {
      if (!Array.isArray(practice.recordings)) {
        practice.recordings = [];
      }
      practice.recordings = [...practice.recordings, ...updatesObj.recordings];
    }

    console.log('Updated practice before save:', practice);

    // 保存更新
    await user.save();
    return practice;


  } catch (error) {
    console.error('Error updating practice:', error);
    throw error;
  }
}

/**
 * 獲取指定使用者的所有練習
 * @param {String} userId 使用者 ID
 * @returns {Array} 使用者的練習陣列
 */
async function getPractices(userId) {
  try {
    const user = await User.findById(userId).select('practices');
    if (!user) {
      throw new Error('使用者不存在');
    }
    return user.practices;
  } catch (error) {
    console.error('Error fetching practices:', error);
    throw error;
  }
}

/**
 * 獲取單一練習詳細資料
 * @param {String} userId 使用者 ID
 * @param {String} practiceId 練習 ID
 * @returns {Object} 指定的練習物件
 */
async function getPracticeDetails(userId, practiceId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('使用者不存在');
    }

    const practice = user.practices.id(practiceId);
    if (!practice) {
      throw new Error('練習不存在');
    }

    return practice;
  } catch (error) {
    console.error('Error fetching practice details:', error);
    throw error;
  }
}

/**
 * 新增一個新的練習
 * @param {String} userId 使用者 ID
 * @param {Object} newPractice 新的練習資料
 * @returns {Object} 新增的練習物件
 */
async function createPractice(userId, newPractice) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('使用者不存在');
    }

    const practice = {
      createdAt: new Date(),
      technique: newPractice.technique || '未指定技巧',
      history: [],
      recordings: [],
      analysis: ''
    };

    user.practices.push(practice);
    await user.save();

    return practice;
  } catch (error) {
    console.error('Error creating practice:', error);
    throw error;
  }
}

/**
 * 刪除指定的練習
 * @param {String} userId 使用者 ID
 * @param {String} practiceId 練習 ID
 * @returns {Boolean} 是否刪除成功
 */
async function deletePractice(userId, practiceId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('使用者不存在');
    }

    const practiceIndex = user.practices.findIndex(p => p._id.toString() === practiceId);
    if (practiceIndex === -1) {
      throw new Error('練習不存在');
    }

    user.practices.splice(practiceIndex, 1); // 從陣列中移除該練習
    await user.save(); // 保存變更到資料庫

    return true;
  } catch (error) {
    console.error('Error deleting practice:', error);
    throw error;
  }
}

module.exports = {
  updatePractice,
  getPractices,
  getPracticeDetails,
  createPractice,
  deletePractice
};
