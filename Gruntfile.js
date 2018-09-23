module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    clean: ['dist'],

    copy: {
      src: {
        cwd: 'src',
        expand: true,
        src: ['**/*'],
        dest: 'dist'
      },
      meta: {
        expand: true,
        src: ['README.md'],
        dest: 'dist'
      }
    },

    watch: {
      src: {
        files: ['src/**/*'],
        tasks: ['build']
      }
    },

    babel: {
      src: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['**/*.js'],
          dest: 'dist'
        }]
      }
    },


  })

  grunt.registerTask('build', ['clean', 'copy', 'babel'])
  grunt.registerTask('default', ['build'])
}
