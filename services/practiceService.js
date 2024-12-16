const User = require('../models/User');
const mongoose = require('mongoose');
/**
 * 更新指定練習的資料
 * @param {String} userId 使用者 ID
 * @param {String} practiceId 練習 ID
 * @param {Object} updates 要更新的資料
 * @returns {Object} 更新後的練習物件
 */
async function updatePractice(practiceId, updates) {
  try {
      console.log('Updating practice with:', { practiceId, updates });

      const updatesObj = typeof updates === 'string' ? { content: updates } : updates;

      const user = await User.findOne({ 'practices._id': practiceId });

      if (!user) {
          console.error('找不到練習:', practiceId);
          throw new Error('練習不存在');
      }

      const practice = user.practices.id(practiceId);

      if (!practice) {
          console.error('練習不存在於用戶文檔中');
          throw new Error('練習不存在');
      }

      if (updatesObj.history) {
          if (!Array.isArray(practice.history)) {
              practice.history = [];
          }
          practice.history = [...practice.history, ...updatesObj.history];
      }

      if (updatesObj.scenario) {
          practice.scenario = updatesObj.scenario;
      }
      if (updatesObj.teacherSuggestion) {
          practice.teacherSuggestion = updatesObj.teacherSuggestion;
      }
      if (updatesObj.analysis) {
          practice.analysis = updatesObj.analysis;
      }

      if (updatesObj.difficulty) { // 新增對 difficulty 的更新
        practice.difficulty = updatesObj.difficulty;
      }

      console.log('練習更新前的內容:', practice);
      await user.save();

      console.log('練習更新成功');
      return practice;

  } catch (error) {

      console.error('Error updating practice:', error.message || error);
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
      difficulty: newPractice.difficulty || '簡單',
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
