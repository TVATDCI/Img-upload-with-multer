export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/integration/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/setTestEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  collectCoverageFrom: [
    'src/utils/responseHelper.js',
    'src/utils/fileUtils.js',
    'src/middlewares/multerError.js',
    'src/services/albumService.js',
    'src/services/imageProcessingService.js',
    'src/models/Album.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
